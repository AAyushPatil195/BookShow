export const SEAT_ROWS = Object.freeze([
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J"
]);

export const SEATS_PER_ROW = 9;

export const getSeatsForRow = (row) =>
    Array.from(
        { length: SEATS_PER_ROW },
        (_, index) => `${row}${index + 1}`
    );
