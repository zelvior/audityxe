"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";

// This project's public Firebase Web config. These values are safe to
// expose client-side by design (Firebase scopes access via security
// rules / server-side verification, not by hiding this config).
const firebaseConfig = {
  apiKey: "AIzaSyDsGnFrKRgQhnzsekz11mPT5geMlpKCrhg",
  authDomain: "audityxe.firebaseapp.com",
  projectId: "audityxe",
  storageBucket: "audityxe.firebasestorage.app",
  messagingSenderId: "1041922971924",
  appId: "1:1041922971924:web:2b72d07b86eb77198c4a01",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
