import React, { useState } from "react";
import logo from "../Images/live-chat_512px.png";
import { Backdrop, Button, CircularProgress, TextField, InputAdornment, IconButton } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Toaster from "./Toaster";

function Login() {
  const [showlogin, setShowLogin] = useState(false);
  const [data, setData] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [logInStatus, setLogInStatus] = React.useState("");
  const [signInStatus, setSignInStatus] = React.useState("");

  const navigate = useNavigate();

  // Validation regexes
  const usernameRegex = /^[a-z0-9]+$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordSpecialCharRegex = /[!@#$%^&*]/;

  // Password strength meter function
  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*]/.test(password)) strength++;
    return strength; // 0-3
  };

  const passwordStrength = getPasswordStrength(data.password);

  // Validation function
  const validateSignUp = () => {
    // Username validation
    if (!data.name.trim()) {
      setSignInStatus({ msg: "Username is required", key: Math.random() });
      return false;
    }
    if (!usernameRegex.test(data.name)) {
      setSignInStatus({
        msg: "Username must contain only lowercase letters and numbers",
        key: Math.random(),
      });
      return false;
    }

    // Email validation
    if (!data.email.trim()) {
      setSignInStatus({ msg: "Email is required", key: Math.random() });
      return false;
    }
    if (!emailRegex.test(data.email)) {
      setSignInStatus({
        msg: "Email must contain @ symbol and be valid format (e.g., test@gmail.com)",
        key: Math.random(),
      });
      return false;
    }

    // Password validation
    if (!data.password) {
      setSignInStatus({ msg: "Password is required", key: Math.random() });
      return false;
    }
    if (data.password.length < 8) {
      setSignInStatus({
        msg: "Password must be at least 8 characters long",
        key: Math.random(),
      });
      return false;
    }
    if (!passwordSpecialCharRegex.test(data.password)) {
      setSignInStatus({
        msg: "Password must contain at least one special character (!@#$%^&*)",
        key: Math.random(),
      });
      return false;
    }

    return true;
  };

  const changeHandler = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const loginHandler = async (e) => {
    setLoading(true);
    console.log(data);
    try {
      const config = {
        headers: {
          "Content-type": "application/json",
        },
      };

      const response = await axios.post(
        "http://localhost:8080/user/login",
        data,
        config
      );
      console.log("Login : ", response);
      setLogInStatus({ msg: "Success", key: Math.random() });
      setLoading(false);
      localStorage.setItem("userData", JSON.stringify(response));
      navigate("/app/welcome");
    } catch (error) {
      setLogInStatus({
        msg: "Invalid User name or Password",
        key: Math.random(),
      });
    }
    setLoading(false);
  };

  const signUpHandler = async () => {
    // Validate before sending to backend
    if (!validateSignUp()) {
      return;
    }

    setLoading(true);
    try {
      const config = {
        headers: {
          "Content-type": "application/json",
        },
      };

      const response = await axios.post(
        "http://localhost:8080/user/register",
        data,
        config
      );
      console.log(response);
      setSignInStatus({ msg: "Success", key: Math.random() });
      navigate("/app/welcome");
      localStorage.setItem("userData", JSON.stringify(response));
      setLoading(false);
    } catch (error) {
      console.log(error);
      if (error.response?.status === 409) {
        setSignInStatus({
          msg: error.response?.data?.message || "User already exists",
          key: Math.random(),
        });
      } else if (error.response?.status === 400) {
        setSignInStatus({
          msg: error.response?.data?.message || "Invalid input",
          key: Math.random(),
        });
      } else {
        setSignInStatus({
          msg: "Signup failed. Please try again.",
          key: Math.random(),
        });
      }
      setLoading(false);
    }
  };

  return (
    <>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <CircularProgress color="secondary" />
      </Backdrop>
      <div className="login-container">
        <div className="image-container">
          <img src={logo} alt="Logo" className="welcome-logo" />
        </div>
        {showlogin && (
          <div className="login-box">
            <p className="login-text">Login to your Account</p>
            <TextField
              onChange={changeHandler}
              id="standard-basic"
              label="Enter User Name"
              variant="outlined"
              color="secondary"
              name="name"
              onKeyDown={(event) => {
                if (event.code === "Enter") {
                  // console.log(event);
                  loginHandler();
                }
              }}
            />
            <TextField
              onChange={changeHandler}
              id="outlined-password-input"
              label="Password"
              type="password"
              autoComplete="current-password"
              color="secondary"
              name="password"
              onKeyDown={(event) => {
                if (event.code === "Enter") {
                  // console.log(event);
                  loginHandler();
                }
              }}
            />
            <Button
              variant="outlined"
              color="secondary"
              onClick={loginHandler}
              disabled={loading}
              sx={{
                position: "relative",
              }}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ marginRight: "10px" }} />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
            <p>
              Don't have an Account ?{" "}
              <span
                className="hyper"
                onClick={() => {
                  setShowLogin(false);
                }}
              >
                Sign Up
              </span>
            </p>
            {logInStatus ? (
              <Toaster key={logInStatus.key} message={logInStatus.msg} />
            ) : null}
          </div>
        )}
        {!showlogin && (
          <div className="login-box">
            <p className="login-text">Create your Account</p>
            <TextField
              onChange={changeHandler}
              id="standard-basic"
              label="Enter User Name"
              variant="outlined"
              color="secondary"
              name="name"
              value={data.name}
              onKeyDown={(event) => {
                if (event.code === "Enter") {
                  signUpHandler();
                }
              }}
            />
            <TextField
              onChange={changeHandler}
              id="standard-basic"
              label="Enter Email Address"
              variant="outlined"
              color="secondary"
              name="email"
              value={data.email}
              onKeyDown={(event) => {
                if (event.code === "Enter") {
                  signUpHandler();
                }
              }}
            />
            <TextField
              onChange={changeHandler}
              id="outlined-password-input"
              label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              color="secondary"
              name="password"
              value={data.password}
              onKeyDown={(event) => {
                if (event.code === "Enter") {
                  signUpHandler();
                }
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      tabIndex={-1}
                      sx={{ color: "#7c8ea6", marginRight: "-12px" }}
                      size="small"
                    >
                      {showPassword ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Password Strength Meter */}
            {data.password && (
              <div style={{ marginTop: "10px" }}>
                <div
                  style={{
                    display: "flex",
                    gap: "5px",
                    marginBottom: "5px",
                    height: "6px",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      backgroundColor:
                        passwordStrength >= 1 ? "#ff6b6b" : "#ddd",
                      borderRadius: "3px",
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      backgroundColor:
                        passwordStrength >= 2 ? "#ffd700" : "#ddd",
                      borderRadius: "3px",
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      backgroundColor:
                        passwordStrength >= 3 ? "#51cf66" : "#ddd",
                      borderRadius: "3px",
                    }}
                  />
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    margin: "5px 0 0 0",
                    color:
                      passwordStrength === 0
                        ? "#666"
                        : passwordStrength === 1
                        ? "#ff6b6b"
                        : passwordStrength === 2
                        ? "#ffd700"
                        : "#51cf66",
                    fontWeight: "bold",
                  }}
                >
                  {passwordStrength === 0 && "Very Weak"}
                  {passwordStrength === 1 && "Weak"}
                  {passwordStrength === 2 && "Medium"}
                  {passwordStrength === 3 && "Strong ✓"}
                </p>
              </div>
            )}

            <Button
              variant="outlined"
              color="secondary"
              onClick={signUpHandler}
              disabled={loading}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ marginRight: "10px" }} />
                  Signing up...
                </>
              ) : (
                "Sign Up"
              )}
            </Button>
            <p>
              Already have an Account ?
              <span
                className="hyper"
                onClick={() => {
                  setShowLogin(true);
                }}
              >
                Log in
              </span>
            </p>
            {signInStatus ? (
              <Toaster key={signInStatus.key} message={signInStatus.msg} />
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}

export default Login;
