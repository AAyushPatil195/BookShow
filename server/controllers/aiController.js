import axios from 'axios';


const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 4_000;
const ALLOWED_ROLES = new Set(['user', 'assistant']);

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
            {messages: validation.messages},
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

        return res.json({success: true, reply: data.reply});
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
