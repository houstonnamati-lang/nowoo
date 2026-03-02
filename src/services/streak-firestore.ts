import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@nowoo/config/firebase";
import type { StreakData } from "@nowoo/stores/streak";

const COLLECTION = "userStreaks";

export async function loadUserStreak(uid: string): Promise<StreakData | null> {
  const db = getFirebaseDb();
  const ref = doc(db, COLLECTION, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    currentStreak: d?.currentStreak ?? 0,
    lastActivityDate: d?.lastActivityDate ?? null,
    moodHistory: Array.isArray(d?.moodHistory) ? d.moodHistory : [],
  };
}

export async function saveUserStreak(uid: string, data: StreakData): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, COLLECTION, uid);
  await setDoc(ref, data);
}
