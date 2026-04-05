import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "../firebase";

GoogleSignin.configure({
  webClientId:
    "67345779081-5vgrormfj18gopgd7h4mv47qoip7e9ns.apps.googleusercontent.com",
});

export function useGoogleAuth() {
  const promptAsync = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const { idToken } = userInfo.data;

      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      console.log("Usuário logado:", userCredential.user);
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log("Login cancelado");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log("Login em progresso");
      } else {
        console.error("Erro no login:", error);
      }
    }
  };

  return { promptAsync, request: null };
}
