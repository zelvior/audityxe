"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";

// Firebase Web config. These values are safe to expose client-side by
// design — Firebase scopes access via security rules and server-side
// token verification, not by hiding this config.
//
// Read from env with the canonical deployment's values as a fallback,
// so this repo stays runnable out of the box while a fork can point at
// its own Firebase project by setting NEXT_PUBLIC_FIREBASE_* without
// touching code. Anyone self-hosting should set these — otherwise
// sign-in attempts go to the original project, which won't have your
// domain in its authorized list.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDsGnFrKRgQhnzsekz11mPT5geMlpKCrhg",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "audityxe.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "audityxe",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "audityxe.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1041922971924",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1041922971924:web:2b72d07b86eb77198c4a01",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const githubProvider = new GithubAuthProvider();
// Request email explicitly — some GitHub accounts have a private email,
// and without this scope Firebase can fail to create/link the account.
githubProvider.addScope("user:email");
