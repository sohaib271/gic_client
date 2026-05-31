import { configureStore, combineReducers } from "@reduxjs/toolkit";
import userReducer from "./userSlice";

import {
  persistStore,
  persistReducer,
} from "redux-persist";

import storage from "redux-persist/lib/storage"; // localStorage

// Persist config
const persistConfig = {
  key: "root",
  storage,
  whitelist: ["user"], // only persist user slice
};

const rootReducer = combineReducers({
  user: userReducer,
});

// Wrap reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // required for redux-persist
    }),
});

// Persistor
export const persistor = persistStore(store);

/* Types */
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;