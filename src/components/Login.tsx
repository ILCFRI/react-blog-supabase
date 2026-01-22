import { useState } from "react";
import { supabase } from "../services/supabaseClient";
import { useDispatch } from "react-redux";
import { setUser } from "../features/auth/authSlice";
import type { AppDispatch } from "../app/store";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  {/* Register */} 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");

  {/* Login */}
  const [emailLogin, setEmailLogin] = useState("");
  const [passwordLogin, setPasswordLogin] = useState("");

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  {/* Login */}
  const handleLogin = async () => {
    if (!emailLogin || !passwordLogin) {
      setError("Please enter email and password");
      return;
    }

    if (!isValidEmail(emailLogin)) {
      setError("Please enter a valid email address");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailLogin,
      password: passwordLogin,
    });

    if (error) {
      setError(error.message);
      return;
    }

    dispatch(setUser(data.session?.user ?? null));
    navigate("/home");
  };

  {/* Register */} 
  const handleRegister = async () => {
  if (!username || !email || !password || !confirmPassword) {
    setError("All fields are required");
    return;
  }

  if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
  }

  if (password !== confirmPassword) {
    setError("Passwords do not match");
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
      },
    },
  });

  if (error) {
    setError(error.message);
    return;
  }
  dispatch(setUser(data.user));
    navigate("/home");
  };

  return (
    <>
      <div className="fixed inset-0 bg-[#1b1b1b] flex justify-center items-center">
        <div className="bg-white p-4 rounded-xl w-full max-w-md">
          {/* Header */}
          <div className="flex justify-center items-center">
            <h2 className="text-3l font-semibold mb-4">
              {isLoginMode ? "Login" : "Register"}
            </h2>
          </div>

          {/* Tab Controls */}
          <div className="relative flex h-12 mb-6 border border-gray-300 rounded-full overflow-hidden">
            <button
              className={`w-1/2 text-lg font-medium transition-all z-10 ${
                isLoginMode ? "text-white" : "text-black"
              }`}
              onClick={() => {
                setIsLoginMode(true);
                clearError();
              }}
            >
              Login
            </button>
            <button
              className={`w-1/2 text-lg font-medium transition-all z-10 ${
                !isLoginMode ? "text-white" : "text-black"
              }`}
              onClick={() => {
                setIsLoginMode(false);
                clearError();
              }}
            >
              Register
            </button>
            <div
              className={`absolute top-0 h-full w-1/2 rounded-full bg-gradient-to-r from-violet-900 via-purple-700 to-violet-400 transition-all ${
                isLoginMode ? "left-0" : "left-1/2"
              }`}
            ></div>
          </div>

          {/* Form */}
          {/* Login */}
          {isLoginMode && (
            <input
              type="email"
              value={emailLogin}
              onChange={(e) => {
                setEmailLogin(e.target.value);
                clearError();
              }}
              placeholder="Email Address"
              required
              className="w-full mt-3 px-4 py-2 border-b border-gray-300 focus:outline-none"
            />
          )}
          {isLoginMode && (
            <input
              type="password"
              value={passwordLogin}
              onChange={(e) => {
                setPasswordLogin(e.target.value);
                clearError();
              }}
              placeholder="Password"
              required
              className="w-full mt-3 px-4 py-2 border-b border-gray-300 focus:outline-none"
            />
          )}

          {/* Register */}
          {!isLoginMode && (
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                clearError();
              }}
              placeholder="Username"
              required
              className="w-full mt-3 px-4 py-2 border-b border-gray-300 focus:outline-none"
            />
          )}

          {!isLoginMode && (
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError();
              }}
              placeholder="Email Address"
              required
              className="w-full mt-3 px-4 py-2 border-b border-gray-300 focus:outline-none"
            />
          )}

          {!isLoginMode && (
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearError();
              }}
              placeholder="Password"
              required
              className="w-full mt-3 px-4 py-2 border-b border-gray-300 focus:outline-none"
            />
          )}

          {!isLoginMode && (
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearError();
              }}
              placeholder="Confirm Password"
              required
              className="w-full mt-3 px-4 py-2 border-b border-gray-300 focus:outline-none"
            />
          )}

          {error && <p className="text-red-500 mt-2">{error}</p>}

          <button
            className="w-full bg-gradient-to-r from-violet-900 via-purple-700 to-violet-400 font-semibold mt-3 py-2 rounded-lg hover:bg-violet-700 text-white transition duration-300"
            onClick={isLoginMode ? handleLogin : handleRegister}
          >
            {isLoginMode ? "Login" : "Register"}
          </button>
        </div>
      </div>
    </>
  );
};

export default Login;
