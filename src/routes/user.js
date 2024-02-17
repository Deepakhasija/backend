import { Router } from "express";
import { registerUser,loginUser,logoutUser, refreshAccesstoken } from "../controllers/user.js";
import { upload } from "../middlewares/multer.js";
import { verifyJwt } from "../middlewares/auth.js";
const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount: 1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser
);

router.route("/login").post(loginUser);
router.route("/logout").post(verifyJwt,logoutUser);
router.route("/refreshAcessToken").post(refreshAccesstoken);

export default router