import { clerkClient, getAuth } from "@clerk/express";

export const protectUser = (req, res, next) => {
    try {
        const auth = getAuth(req);
        if(!auth.isAuthenticated || !auth.userId){
            console.warn('Clerk authentication rejected', {
                reason: auth.reason,
                tokenType: auth.tokenType
            });
            return res.status(401).json({success: false, message: 'Authentication required'});
        }
        req.userId = auth.userId;
        next();
    } catch (error) {
        console.warn('Clerk authentication could not be evaluated');
        return res.status(401).json({success: false, message: 'Authentication required'});
    }
};

export const protectAdmin = async (req, res, next) => {
    try {
        const { userId } = req.auth();
        const user = await clerkClient.users.getUser(userId);

        if(user.privateMetadata.role !== 'admin'){
            return res.json({success: false, message: 'Not authorized'});
        }
        next();
    } catch (error) {
        return res.json({success: false, message: 'Not authorized'})
    }
}
