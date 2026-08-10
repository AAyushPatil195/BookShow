import axios from 'axios';
import crypto from 'crypto';
import Booking from '../models/Booking.js';


const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 4_000;
const ALLOWED_ROLES = new Set(['user', 'assistant']);
const SHOW_ID_PATTERN = /^[0-9a-fA-F]{24}$/;
const SEAT_PATTERN = /^[A-J][1-9]$/;
const USER_ID_PATTERN = /^user_[A-Za-z0-9]+$/;

export const validateChatMessages = (messages) => {
    if(!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES){
        return {
            valid: false,
            message: `Messages must contain between 1 and ${MAX_MESSAGES} items.`
        };
    }

    const normalizedMessages = [];
    for(const message of messages){
        if(!message || typeof message !== 'object' || Array.isArray(message)){
            return {valid: false, message: 'Each message must be an object.'};
        }

        const {role, content} = message;
        if(!ALLOWED_ROLES.has(role)){
            return {valid: false, message: 'Message role must be user or assistant.'};
        }
        if(typeof content !== 'string'){
            return {valid: false, message: 'Message content must be text.'};
        }

        const normalizedContent = content.trim();
        if(!normalizedContent || normalizedContent.length > MAX_MESSAGE_LENGTH){
            return {
                valid: false,
                message: `Message content must contain 1-${MAX_MESSAGE_LENGTH} characters.`
            };
        }

        normalizedMessages.push({role, content: normalizedContent});
    }

    if(normalizedMessages.at(-1).role !== 'user'){
        return {valid: false, message: 'The latest message must be from the user.'};
    }

    return {valid: true, messages: normalizedMessages};
};

const normalizeBookingDraft = (action) => {
    if(action === undefined || action === null) return null;
    if(!action || typeof action !== 'object' || Array.isArray(action)) return undefined;
    if(action.type !== 'booking_draft' || !SHOW_ID_PATTERN.test(action.showId || '')){
        return undefined;
    }
    if(!Array.isArray(action.selectedSeats) || action.selectedSeats.length < 1 || action.selectedSeats.length > 5){
        return undefined;
    }

    const selectedSeats = action.selectedSeats.map((seat) =>
        typeof seat === 'string' ? seat.trim().toUpperCase() : ''
    );
    if(
        selectedSeats.some((seat) => !SEAT_PATTERN.test(seat))
        || new Set(selectedSeats).size !== selectedSeats.length
    ){
        return undefined;
    }

    return {
        type: 'booking_draft',
        showId: action.showId,
        selectedSeats
    };
};

export const forwardAiChat = async (req, res) => {
    const validation = validateChatMessages(req.body?.messages);
    if(!validation.valid){
        return res.status(400).json({success: false, message: validation.message});
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL?.trim().replace(/\/+$/, '');
    const aiServiceSecret = process.env.AI_SERVICE_SECRET?.trim();

    if(!aiServiceUrl || !aiServiceSecret){
        return res.status(503).json({
            success: false,
            message: 'AI assistant is not configured.'
        });
    }

    try {
        const {data} = await axios.post(
            `${aiServiceUrl}/chat`,
            {
                messages: validation.messages,
                userId: req.userId
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-AI-Service-Key': aiServiceSecret
                },
                timeout: 60_000
            }
        );

        if(data?.success !== true || typeof data.reply !== 'string' || !data.reply.trim()){
            throw new Error('AI service returned an invalid response.');
        }

        const action = normalizeBookingDraft(data.action);
        if(action === undefined){
            throw new Error('AI service returned an invalid action.');
        }

        return res.json({
            success: true,
            reply: data.reply,
            ...(action ? {action} : {})
        });
    } catch (error) {
        console.error('AI service request failed', {
            status: error.response?.status,
            code: error.code
        });

        const statusCode = error.code === 'ECONNABORTED' ? 504 : 502;
        return res.status(statusCode).json({
            success: false,
            message: 'AI assistant is temporarily unavailable.'
        });
    }
};

const secretsMatch = (providedSecret, expectedSecret) => {
    if(!providedSecret || !expectedSecret) return false;
    const provided = Buffer.from(providedSecret);
    const expected = Buffer.from(expectedSecret);
    return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
};

export const protectAiService = (req, res, next) => {
    const providedSecret = req.get('X-AI-Service-Key')?.trim();
    const expectedSecret = process.env.AI_SERVICE_SECRET?.trim();

    if(!secretsMatch(providedSecret, expectedSecret)){
        return res.status(401).json({success: false, message: 'Invalid service credentials'});
    }
    next();
};

export const getRecentBookingsForAi = async (req, res) => {
    const userId = req.get('X-QuickShow-User-Id')?.trim();
    if(!USER_ID_PATTERN.test(userId || '')){
        return res.status(400).json({success: false, message: 'Invalid user context'});
    }

    try {
        const bookings = await Booking.find({user: userId})
            .sort({createdAt: -1})
            .limit(3)
            .populate({
                path: 'show',
                select: 'showDateTime movie',
                populate: {path: 'movie', select: 'title'}
            })
            .lean();

        return res.json({
            success: true,
            bookings: bookings.map((booking) => ({
                movieTitle: booking.show?.movie?.title || 'Unknown movie',
                showDateTime: booking.show?.showDateTime || null,
                seats: Array.isArray(booking.bookedSeats) ? booking.bookedSeats : [],
                isPaid: booking.isPaid === true
            }))
        });
    } catch (error) {
        console.error('Recent AI bookings lookup failed', {message: error.message});
        return res.status(500).json({
            success: false,
            message: 'Could not retrieve recent bookings'
        });
    }
};
