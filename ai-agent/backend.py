from datetime import datetime, timezone
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import requests


class QuickShowAPI:
    def __init__(
        self,
        base_url: str,
        timeout: int = 15,
        display_timezone: str = "Asia/Kolkata",
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.display_timezone_name = display_timezone
        try:
            self.display_timezone = ZoneInfo(display_timezone)
        except ZoneInfoNotFoundError as error:
            raise RuntimeError(
                f"Unknown DISPLAY_TIMEZONE: {display_timezone}"
            ) from error

    def _get(self, path: str) -> dict[str, Any]:
        try:
            response = requests.get(
                f"{self.base_url}{path}",
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
