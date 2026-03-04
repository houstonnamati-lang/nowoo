import { doc, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@nowoo/config/firebase";

const COLLECTION = "userPushTokens";

export async function saveUserPushToken(uid: string, expoPushToken: string): Promise<void> {
  if (!uid || !expoPushToken) return;

  const db = getFirebaseDb();
  const ref = doc(db, COLLECTION, uid);

  await setDoc(
    ref,
    {
      expoPushToken,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

