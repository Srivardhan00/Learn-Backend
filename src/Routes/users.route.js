import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  createAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateDetails,
  updateAvatar,
  updateCoverImage,
} from "../Controllers/users.controllers.js";
import { upload } from "../Middlewares/multer.js";
import { verifyJWT } from "../Middlewares/auth.js";

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

router.route("/login").post(
  upload.none(), //we needed to use this, as we don't have any files to handle, so all the form-data to be converted to json
  //without this, error would raise because the req is of another type not json, and we get
  loginUser
);

router.route("/logout").post(verifyJWT, logoutUser);

router.route("/change-password").patch(verifyJWT, changeCurrentPassword);

router.route("/refresh-token").get(createAccessToken);

router.route("/get-user").get(verifyJWT, getCurrentUser);

router.route("/update-details").patch(verifyJWT, updateDetails);

router
  .route("/update-avatar")
  .patch(verifyJWT, upload.single("avatar"), updateAvatar);

router
  .route("/update-cover-image")
  .patch(verifyJWT, upload.single("coverImage"), updateCoverImage);

export default router;
