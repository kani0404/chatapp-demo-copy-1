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
            borderRadius: "12px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
          }
        }}
      >
        <DialogTitle sx={{
          fontSize: "18px",
          fontWeight: "600",
          color: lightTheme ? "#1F2937" : "#E5E7EB",
          backgroundColor: lightTheme ? "#F9FAFB" : "#111827",
          borderBottom: "1px solid " + (lightTheme ? "#E5E7EB" : "#374151"),
        }}>
          Create New Group
        </DialogTitle>

        <DialogContent sx={{
          backgroundColor: lightTheme ? "#FFFFFF" : "#1F2937",
          padding: "24px",
        }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 2 }}>
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
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    backgroundColor: lightTheme ? "#F9FAFB" : "#111827",
                    "& fieldset": {
                      borderColor: lightTheme ? "#D1D5DB" : "#374151",
                    },
                    "&:hover fieldset": {
                      borderColor: lightTheme ? "#1976D2" : "#3B82F6",
                    },
                    "&.Focused fieldset": {
                      borderColor: "#1976D2",
                    },
                  },
                  "& .MuiOutlinedInput-input": {
                    color: lightTheme ? "#1F2937" : "#E5E7EB",
                  },
                  "& .MuiInputBase-input::placeholder": {
                    color: lightTheme ? "#9CA3AF" : "#6B7280",
                    opacity: 1,
                  },
                  "& .MuiInputLabel-root": {
                    color: lightTheme ? "#6B7280" : "#9CA3AF",
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
              }}>
                Select Members 
                <span style={{
                  marginLeft: "8px",
                  backgroundColor: "#1976D2",
                  color: "white",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: "600",
                }}>
                  {selectedMembers.length}
                </span>
              </label>

              {fetchingUsers ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <Box sx={{
                  maxHeight: "320px",
                  overflowY: "auto",
                  border: "1px solid " + (lightTheme ? "#E5E7EB" : "#374151"),
                  borderRadius: "10px",
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
                          borderRadius: "8px",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          backgroundColor: selectedMembers.includes(member._id)
                            ? lightTheme ? "#E3F2FD" : "#1E3A5F"
                            : lightTheme ? "#FFFFFF" : "#1F2937",
                          border: selectedMembers.includes(member._id)
                            ? "2px solid #1976D2"
                            : "1px solid transparent",
                          "&:hover": {
                            backgroundColor: lightTheme ? "#F0F9FF" : "#243447",
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
                              color: "#1976D2",
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
          </Box>
        </DialogContent>

        <DialogActions sx={{
          backgroundColor: lightTheme ? "#F9FAFB" : "#111827",
          borderTop: "1px solid " + (lightTheme ? "#E5E7EB" : "#374151"),
          padding: "16px",
          gap: "12px",
        }}>
          <Button
            onClick={handleClose}
            variant="outlined"
            sx={{
              borderColor: lightTheme ? "#D1D5DB" : "#4B5563",
              color: lightTheme ? "#1F2937" : "#E5E7EB",
              textTransform: "none",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: "600",
              padding: "10px 24px",
              "&:hover": {
                backgroundColor: lightTheme ? "#F3F4F6" : "#1F2937",
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
              backgroundColor: "#1976D2",
              color: "white",
              textTransform: "none",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: "600",
              padding: "10px 24px",
              "&:hover": {
                backgroundColor: "#1565C0",
              },
              "&:disabled": {
                backgroundColor: "#D1D5DB",
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
        className={"addconv-btn" + (lightTheme ? "" : " dark")}
        style={{
          backgroundColor: "#0084FF",
          color: "white",
          border: "none",
          padding: "10px 20px",
          borderRadius: "6px",
          fontSize: "14px",
          fontWeight: "600",
          cursor: "pointer",
          transition: "all 0.2s ease",
          marginTop: "12px",
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = "#0073E6"}
        onMouseOut={(e) => e.target.style.backgroundColor = "#0084FF"}
      >
        Create Group
      </button>
    </>
  );
}

export default CreateGroups;
