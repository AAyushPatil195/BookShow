// Shared by Node fixture tools and k6; no packages or network imports.
export const fixtureVersion = 1;
export const maxRequests = 500;
export const movieIds = Array.from({ length: 100 }, (_, i) => String(99000000 + i));
export const seatNames = Array.from({ length: 90 }, (_, i) => `${String.fromCharCode(65 + Math.floor(i / 9))}${i % 9 + 1}`);
const id = n => `be000001${n.toString(16).padStart(16, '0')}`;
export const sameSeatShow = id(0);
export const differentSeatShows = Array.from({ length: Math.ceil(maxRequests / 90) }, (_, i) => id(1 + i));
export const differentShows = Array.from({ length: maxRequests }, (_, i) => id(100 + i));
export const catalogShows = movieIds.map((_, i) => id(1000 + i));
export const ttlShow = id(2000);
export const allShowIds = [sameSeatShow, ...differentSeatShows, ...differentShows, ...catalogShows, ttlShow];
export const bookingModes = ['same-seat', 'different-seat', 'different-show'];
export function requestFor(mode, index) {
    if (!Number.isInteger(index) || index < 0 || index >= maxRequests) throw new Error('Invalid request index');
    if (mode === 'same-seat') return { showId: sameSeatShow, selectedSeats: ['A1'] };
    if (mode === 'different-seat') return { showId: differentSeatShows[Math.floor(index / 90)], selectedSeats: [seatNames[index % 90]] };
    if (mode === 'different-show') return { showId: differentShows[index], selectedSeats: ['A1'] };
    throw new Error('Unknown booking mode');
}
