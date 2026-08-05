import {
    acquireBookingLock,
    releaseBookingLock
} from "../services/bookingLockService.js";

const showId = "test-show-123";

const firstLock = await acquireBookingLock(showId);
console.log("First request acquired:", Boolean(firstLock));

const secondLock = await acquireBookingLock(showId);
console.log("Second request acquired:", Boolean(secondLock));

const firstReleased = await releaseBookingLock(firstLock);
console.log("First lock released:", firstReleased);

const thirdLock = await acquireBookingLock(showId);
console.log("Third request acquired:", Boolean(thirdLock));

const cleanupCompleted = await releaseBookingLock(thirdLock);
console.log("Cleanup completed:", cleanupCompleted);