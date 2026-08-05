import { z } from "zod";

const objectIdSchema = z.string()
    .trim()
    .regex(/^[a-f\d]{24}$/i, "Invalid show ID");

const movieIdSchema = z.coerce.string()
    .trim()
    .regex(/^\d+$/, "Invalid movie ID");

const seatSchema = z.string()
    .trim()
    .transform((seat) => seat.toUpperCase())
    .pipe(z.string().regex(/^[A-J][1-9]$/, "Invalid seat number"));

const dateSchema = z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format")
    .refine(
        (date) => !Number.isNaN(new Date(`${date}T00:00:00`).getTime()),
        "Invalid show date"
    );

const timeSchema = z.string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must use HH:mm format");

export const createBookingBodySchema = z.object({
    showId: objectIdSchema,
    selectedSeats: z.array(seatSchema)
        .min(1, "Select at least one seat")
        .max(5, "You can select at most five seats")
        .refine(
            (seats) => new Set(seats).size === seats.length,
            "Duplicate seats are not allowed"
        )
}).strict();

export const showIdParamsSchema = z.object({
    showId: objectIdSchema
});

export const movieIdParamsSchema = z.object({
    movieId: movieIdSchema
});

export const addShowBodySchema = z.object({
    movieId: movieIdSchema,
    showsInput: z.array(
        z.object({
            date: dateSchema,
            time: z.array(timeSchema)
                .min(1, "Add at least one show time")
                .max(24, "Too many show times for one date")
        }).strict()
    )
        .min(1, "Add at least one show")
        .max(31, "Too many show dates"),
    showPrice: z.number()
        .finite()
        .positive("Show price must be greater than zero")
        .max(100000, "Show price is too high")
}).strict();

export const favouriteBodySchema = z.object({
    movieId: movieIdSchema
}).strict();
