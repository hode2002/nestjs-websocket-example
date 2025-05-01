import { http } from "@/lib/http"

export const getAllRooms = async ()=> {
    const res = await http.get('/rooms')
    return res.data
}
