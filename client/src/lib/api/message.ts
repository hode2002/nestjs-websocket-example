import { http } from "@/lib/http"

export const getRoomMessages = async (roomId:string)=> {
    const res = await http.get(`/messages?roomId=${roomId}`)
    return res.data
}
