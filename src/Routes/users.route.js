import { Router } from "express";
import registerUser from "../Controllers/users.controllers.js";

const router = Router();

router.route("/register").post(registerUser);

export default router;
