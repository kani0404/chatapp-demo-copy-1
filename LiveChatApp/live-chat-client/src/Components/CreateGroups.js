import React, { useState, useEffect } from "react";
import DoneOutlineRoundedIcon from "@mui/icons-material/DoneOutlineRounded";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Checkbox,
  FormControlLabel,
  Box,
  TextField,
  CircularProgress,
} from "@mui/material";
import { useSelector } from "react-redux";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function CreateGroups() {
  const lightTheme = useSelector((state) => state.themeKey);
  const userData = JSON.parse(localStorage.getItem("userData"));
  const nav = useNavigate();
  
  if (!userData) {
    console.log("User not Authenticated");
    nav("/");
  }
  
  const user = userData.data;
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  useEffect(() => {
    if (open) {
      setFetchingUsers(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      axios
        .get("http://localhost:8080/user/fetchUsers", config)
        .then((response) => {
          const filteredUsers = response.data.filter(
            (u) => u._id !== user._id
          );
          setAllUsers(filteredUsers);
          setFetchingUsers(false);
        })
        .catch((error) => {
          console.error("Error fetching users:", error);
          setFetchingUsers(false);
        });
    }
  }, [open]);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedMembers([]);
    setGroupName("");
  };

  const handleMemberToggle = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const createGroup = () => {
    if (!groupName.trim()) {
      alert("Please enter a group name");
      return;
    }
    if (selectedMembers.length === 0) {
      alert("Please select at least one member");
      return;
    }

    setLoading(true);
    const config = {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    };

    axios
      .post(
        "http://localhost:8080/group/create",
        {
          groupName: groupName,
          members: selectedMembers,
        },
        config
      )
      .then((response) => {
        console.log("Group created:", response.data);
        setLoading(false);
        setOpen(false);
        setGroupName("");
        setSelectedMembers([]);
        nav("/app/groups");
        alert("Group created successfully!");
      })
      .catch((error) => {
        console.error("Error creating group:", error);
        setLoading(false);
        alert("Error creating group: " + error.response?.data?.message);
      });
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "20px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            background: lightTheme ? "#FFFFFF" : "#0f172a",
          }
        }}
      >
        <DialogTitle sx={{
          fontSize: "20px",
          fontWeight: "700",
          color: lightTheme ? "#1F2937" : "#E5E7EB",
          backgroundColor: lightTheme ? "#F9FAFB" : "#111827",
          borderBottom: "2px solid " + (lightTheme ? "#E5E7EB" : "#374151"),
          padding: "20px 24px",
          textAlign: "center",
        }}>
          ✨ Create New Group
        </DialogTitle>

        <DialogContent sx={{
          backgroundColor: lightTheme ? "#FFFFFF" : "#1F2937",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}>
          {/* Group Name Input */}
          <Box>
            <label style={{
              display: "block",
              marginBottom: "12px",
              fontSize: "15px",
              fontWeight: "700",
              color: lightTheme ? "#1F2937" : "#E5E7EB",
            }}>
              Group Name
            </label>
            <TextField
              fullWidth
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              variant="outlined"
              size="medium"
              autoFocus
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  backgroundColor: lightTheme ? "#F9FAFB" : "#111827",
                  "& fieldset": {
                    borderColor: lightTheme ? "#D1D5DB" : "#374151",
                    borderWidth: "2px",
                  },
                  "&:hover fieldset": {
                    borderColor: lightTheme ? "#1976D2" : "#3B82F6",
                  },
                  "&.Focused fieldset": {
                    borderColor: "#007bff",
                    boxShadow: "0 0 0 3px rgba(0, 123, 255, 0.1)",
                  },
                },
                "& .MuiOutlinedInput-input": {
                  color: lightTheme ? "#1F2937" : "#E5E7EB",
                  fontSize: "15px",
                },
                "& .MuiInputBase-input::placeholder": {
                  color: lightTheme ? "#9CA3AF" : "#6B7280",
                  opacity: 1,
                },
              }}
            />
          </Box>

          {/* Members Selection */}
          <Box>
            <label style={{
              display: "block",
              marginBottom: "12px",
              fontSize: "15px",
              fontWeight: "700",
              color: lightTheme ? "#1F2937" : "#E5E7EB",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              Select Members 
              <span style={{
                backgroundColor: "#007bff",
                color: "white",
                padding: "4px 12px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: "600",
              }}>
                {selectedMembers.length}
              </span>
            </label>

            {fetchingUsers ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress size={24} color="inherit" />
              </Box>
            ) : (
              <Box sx={{
                maxHeight: "280px",
                overflowY: "auto",
                border: "2px solid " + (lightTheme ? "#E5E7EB" : "#374151"),
                borderRadius: "12px",
                padding: "12px",
                backgroundColor: lightTheme ? "#F9FAFB" : "#111827",
                scrollbarWidth: "thin",
                scrollbarColor: lightTheme ? "#D1D5DB #F9FAFB" : "#4B5563 #111827",
              }}>
                {allUsers.length === 0 ? (
                  <p style={{
                    textAlign: "center",
                    color: lightTheme ? "#9CA3AF" : "#6B7280",
                    padding: "24px 16px",
                    fontSize: "14px",
                  }}>
                    No users available
                  </p>
                ) : (
                  allUsers.map((member) => (
                    <Box
                      key={member._id}
                      onClick={() => handleMemberToggle(member._id)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        padding: "12px",
                        marginBottom: "8px",
                        borderRadius: "10px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        backgroundColor: selectedMembers.includes(member._id)
                          ? lightTheme ? "#E3F2FD" : "#1E3A5F"
                          : lightTheme ? "#FFFFFF" : "#1F2937",
                        border: selectedMembers.includes(member._id)
                          ? "2px solid #007bff"
                          : "1px solid transparent",
                        "&:hover": {
                          backgroundColor: lightTheme ? "#F0F9FF" : "#243447",
                          transform: "translateX(4px)",
                        },
                      }}
                    >
                      <Checkbox
                        checked={selectedMembers.includes(member._id)}
                        onChange={() => handleMemberToggle(member._id)}
                        size="medium"
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          color: lightTheme ? "#D1D5DB" : "#6B7280",
                          "&.Mui-checked": {
                            color: "#007bff",
                          },
                        }}
                      />
                      <span style={{
                        marginLeft: "12px",
                        fontSize: "15px",
                        fontWeight: "500",
                        color: lightTheme ? "#1F2937" : "#E5E7EB",
                        flex: 1,
                      }}>
                        {member.name}
                      </span>
                    </Box>
                  ))
                )}
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{
          backgroundColor: lightTheme ? "#F9FAFB" : "#111827",
          borderTop: "2px solid " + (lightTheme ? "#E5E7EB" : "#374151"),
          padding: "16px 24px",
          gap: "12px",
          justifyContent: "space-between",
        }}>
          <Button
            onClick={handleClose}
            variant="outlined"
            sx={{
              borderColor: lightTheme ? "#D1D5DB" : "#4B5563",
              color: lightTheme ? "#1F2937" : "#E5E7EB",
              textTransform: "none",
              borderRadius: "10px",
              fontSize: "15px",
              fontWeight: "600",
              padding: "10px 24px",
              border: "2px solid",
              "&:hover": {
                backgroundColor: lightTheme ? "#F3F4F6" : "#1F2937",
                borderColor: lightTheme ? "#9CA3AF" : "#6B7280",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={createGroup}
            variant="contained"
            disabled={loading || !groupName.trim() || selectedMembers.length === 0}
            sx={{
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              color: "white",
              textTransform: "none",
              borderRadius: "10px",
              fontSize: "15px",
              fontWeight: "700",
              padding: "10px 24px",
              "&:hover:not(:disabled)": {
                background: "linear-gradient(135deg, #16a34a, #15803d)",
                transform: "translateY(-2px)",
                boxShadow: "0 6px 16px rgba(34, 197, 94, 0.3)",
              },
              "&:disabled": {
                background: "#D1D5DB",
                color: "#9CA3AF",
              },
            }}
            endIcon={loading ? <CircularProgress size={16} color="inherit" /> : <DoneOutlineRoundedIcon />}
          >
            {loading ? "Creating..." : "Create Group"}
          </Button>
        </DialogActions>
      </Dialog>

      <button
        onClick={handleClickOpen}
        className="new-group-btn"
        style={{
          width: "100%",
          marginTop: "12px",
          fontSize: "18px",
          padding: "16px",
          fontWeight: "700",
          letterSpacing: "0.5px",
          boxShadow: "0 8px 24px rgba(0, 212, 255, 0.6)",
        }}
      >
        ➕ Create New Group
      </button>
    </>
  );
}

export default CreateGroups;
