import { createSlice } from "@reduxjs/toolkit";

const socketSlice = createSlice({
    name:"socketio",
    initialState:{
        // NEVER store the socket instance in redux; use null in persisted state!
        socket:null
    },
    reducers:{
        // actions
        setSocket:(state,action) => {
            state.socket = action.payload;
        }
    }
});
export const {setSocket} = socketSlice.actions;
export default socketSlice.reducer;