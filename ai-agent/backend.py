from datetime import datetime, timezone
import re
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import requests


SEAT_ROWS = tuple("ABCDEFGHIJ")
SEATS_PER_ROW = 9


class QuickShowAPI:
    def __init__(
        self,
        base_url: str,
        timeout: int = 15,
        display_timezone: str = "Asia/Kolkata",
        service_secret: str = "",
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.display_timezone_name = display_timezone
        self.service_secret = service_secret.strip()
        try:
            self.display_timezone = ZoneInfo(display_timezone)
        except ZoneInfoNotFoundError as error:
            raise RuntimeError(
                f"Unknown DISPLAY_TIMEZONE: {display_timezone}"
            ) from error

    def _get(
        self,
        path: str,
        params: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        try:
            response = requests.get(
                f"{self.base_url}{path}",
                params=params,
                headers=headers,
                timeout=self.timeout,
            )
            response.raise_for_status()
            payload = response.json()
        except requests.RequestException as error:
            raise RuntimeError(
                "QuickShow backend is unavailable. Check QUICKSHOW_API_URL and "
                "make sure the backend is running."
            ) from error
        except ValueError as error:
            raise RuntimeError("QuickShow returned an invalid response.") from error

        if not payload.get("success"):
            raise RuntimeError(payload.get("message", "QuickShow request failed."))
        return payload

    def get_recent_bookings(self, user_id: str) -> list[dict[str, Any]]:
        if not re.fullmatch(r"user_[A-Za-z0-9]+", user_id or ""):
            raise RuntimeError("Authenticated user context is unavailable.")
        if not self.service_secret:
            raise RuntimeError("AI service authentication is not configured.")

        payload = self._get(
            "/api/ai/internal/recent-bookings",
            headers={
                "X-AI-Service-Key": self.service_secret,
                "X-QuickShow-User-Id": user_id,
            },
        )

        recent_bookings = []
        for booking in payload.get("bookings", [])[:3]:
            show_datetime = self._format_show_datetime(
                str(booking.get("showDateTime", ""))
            )
            recent_bookings.append(
                {
                    "movie_title": booking.get("movieTitle", "Unknown movie"),
                    "show": show_datetime,
                    "seats": booking.get("seats", []),
                    "payment_paid": bool(booking.get("isPaid", False)),
                }
            )
        return recent_bookings

    def get_playing_movies(self) -> list[dict[str, Any]]:
        payload = self._get("/api/show/all-shows")
        return payload.get("shows", [])

    def search_movies(
        self,
        title: str = "",
        cast: str = "",
        genre: str = "",
        language: str = "",
        minimum_rating: float = 0,
    ) -> list[dict[str, Any]]:
        title_query = title.casefold().strip()
        cast_query = cast.casefold().strip()
        genre_query = genre.casefold().strip()
        language_query = language.casefold().strip()

        matches = []
        for movie in self.get_playing_movies():
            genres = movie.get("genres") or []
            casts = movie.get("casts") or []

            if title_query and title_query not in movie.get("title", "").casefold():
                continue
            if cast_query and not any(
                cast_query in member.get("name", "").casefold()
                for member in casts
            ):
                continue
            if genre_query and not any(
                genre_query in item.get("name", "").casefold()
                for item in genres
            ):
                continue
            if language_query and language_query not in movie.get(
                "original_language", ""
            ).casefold():
                continue
            if float(movie.get("vote_average") or 0) < max(minimum_rating, 0):
                continue

            matches.append(self._movie_summary(movie))

        return matches[:20]

    def get_movie_details(self, movie_id: str) -> dict[str, Any]:
        safe_movie_id = movie_id.strip()
        if not safe_movie_id or not safe_movie_id.isdigit():
            raise RuntimeError("A valid numeric movie ID is required.")

        payload = self._get(f"/api/show/{safe_movie_id}")
        movie = payload.get("movie")
        if not movie:
            raise RuntimeError("Movie not found in QuickShow.")

        showtimes = []
        for date, shows in (payload.get("dateTime") or {}).items():
            for show in shows:
                raw_time = show.get("time", "")
                local_datetime = self._format_show_datetime(raw_time, date)
                showtimes.append(
                    {
                        **local_datetime,
                        "show_id": show.get("showId"),
                    }
                )

        return {
            **self._movie_summary(movie),
            "tagline": movie.get("tagline", ""),
            "overview": movie.get("overview", ""),
            "runtime_minutes": movie.get("runtime"),
            "release_date": movie.get("release_date"),
            "cast": [
                member.get("name")
                for member in (movie.get("casts") or [])[:10]
                if member.get("name")
            ],
            "showtimes": showtimes,
        }

    def get_available_seats(self, show_id: str, row: str) -> dict[str, Any]:
        safe_show_id = show_id.strip()
        if not re.fullmatch(r"[0-9a-fA-F]{24}", safe_show_id):
            raise RuntimeError("A valid show ID is required.")

        safe_row = row.strip().upper()
        if safe_row not in SEAT_ROWS:
            raise RuntimeError(
                f"Invalid row. Choose one of: {', '.join(SEAT_ROWS)}"
            )

        payload = self._get(
            f"/api/booking/seats/{safe_show_id}",
            params={"row": safe_row},
        )

        row_seats = [f"{safe_row}{number}" for number in range(1, SEATS_PER_ROW + 1)]
        occupied_seats = {
            str(seat).upper() for seat in payload.get("occupiedSeats", [])
        }
        available_seats = payload.get("availableSeats")

        # Supports the deployed Phase 1 backend until the enhanced endpoint is deployed.
        if not isinstance(available_seats, list):
            available_seats = [
                seat for seat in row_seats if seat not in occupied_seats
            ]

        return {
            "show_id": safe_show_id,
            "row": safe_row,
            "available_seats": available_seats,
            "occupied_seats": [
                seat for seat in row_seats if seat in occupied_seats
            ],
            "availability_is_live": True,
            "notice": (
                "These seats are not held and may become unavailable before booking."
            ),
        }

    def prepare_booking(
        self,
        show_id: str,
        selected_seats: list[str],
    ) -> dict[str, Any]:
        safe_show_id = show_id.strip()
        if not re.fullmatch(r"[0-9a-fA-F]{24}", safe_show_id):
            raise RuntimeError("A valid show ID is required.")
        if not isinstance(selected_seats, list):
            raise RuntimeError("Selected seats must be a list.")

        normalized_seats = [str(seat).strip().upper() for seat in selected_seats]
        if not 1 <= len(normalized_seats) <= 5:
            raise RuntimeError("Choose between 1 and 5 seats.")
        if len(set(normalized_seats)) != len(normalized_seats):
            raise RuntimeError("Selected seats must be unique.")
        if any(not re.fullmatch(r"[A-J][1-9]", seat) for seat in normalized_seats):
            raise RuntimeError("Each seat must use the format A1 through J9.")

        unavailable_seats = []
        for row in sorted({seat[0] for seat in normalized_seats}):
            availability = self.get_available_seats(safe_show_id, row)
            available_seats = set(availability.get("available_seats", []))
            unavailable_seats.extend(
                seat for seat in normalized_seats
                if seat[0] == row and seat not in available_seats
            )

        if unavailable_seats:
            raise RuntimeError(
                f"These seats are no longer available: {', '.join(unavailable_seats)}"
            )

        return {
            "type": "booking_draft",
            "show_id": safe_show_id,
            "selected_seats": normalized_seats,
            "seat_count": len(normalized_seats),
            "availability_is_live": True,
            "notice": (
                "This is only a draft. Seats are not held until booking begins."
            ),
        }

    @staticmethod
    def _movie_summary(movie: dict[str, Any]) -> dict[str, Any]:
        return {
            "movie_id": str(movie.get("_id", "")),
            "title": movie.get("title", "Unknown"),
            "genres": [
                item.get("name")
                for item in (movie.get("genres") or [])
                if item.get("name")
            ],
            "language": movie.get("original_language", ""),
            "rating": movie.get("vote_average"),
            "top_cast": [
                member.get("name")
                for member in (movie.get("casts") or [])[:5]
                if member.get("name")
            ],
        }

    def _format_show_datetime(
        self,
        value: str,
        fallback_date: str = "",
    ) -> dict[str, str]:
        if not value:
            return {
                "date": fallback_date,
                "time": "",
                "timezone": self.display_timezone_name,
            }
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            local_time = parsed.astimezone(self.display_timezone)
            return {
                "date": local_time.strftime("%Y-%m-%d"),
                "time": local_time.strftime("%I:%M %p").lstrip("0"),
                "timezone": self.display_timezone_name,
            }
        except ValueError:
            return {
                "date": fallback_date,
                "time": value,
                "timezone": "unconverted",
            }
