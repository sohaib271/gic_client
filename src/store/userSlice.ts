import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface User {
  _id: string;
  specialId:string;
  phone:string;
  address:string;
  department:string;
  session:string | null;
  whatsappNumber:string | null;
  cnic:string;
  name: string;
  email: string;
  role: string;
  gender:string | null
}

interface UserState {
  user: User | null;
}

const initialState: UserState = {
  user: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,

  reducers: {
    setUser(state, action: PayloadAction<{ user: User}>) {
      state.user = action.payload.user;
    },

    clearUser(state) {
      state.user = null;
    },
  },
});

export const { setUser, clearUser } = userSlice.actions;

export default userSlice.reducer;