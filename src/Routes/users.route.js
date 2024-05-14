import { Router } from "express";
import registerUser from "../Controllers/users.controllers.js";
import upload from "../Middlewares/multer.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 3,
    },
  ]),
  registerUser
);

export default router;
