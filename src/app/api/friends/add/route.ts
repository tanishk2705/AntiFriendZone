import { fetchRedis } from "@/helpers/redis"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { pusherServer } from '@/lib/pusher'
import { toPusherKey } from '@/lib/utils'
import { addFriendValidator } from "@/lib/validations/add-friend"
import { getServerSession } from "next-auth"
import { z } from "zod"

export async function POST(req:Request){
        try {
                const body = await req.json()
                const {email:emailToAdd} = addFriendValidator.parse(body.email)

                
                const idToAdd = (await fetchRedis('get',`user:email:${emailToAdd}`)) as string

                //Does the person exist
                if(!idToAdd){
                        return new Response('This person does not exist.',{status:400})
                }

                //Who is even making that request
                console.log("Before getServerSession");
                const session = await getServerSession(authOptions)
                if(!session){
                        return new Response('Unauthorized',{status:401})
                }
                console.log("Session:", session);
                console.log("After getServerSession");

                //User shouldn't be able to add themselves(they are already logged in)
                if(idToAdd === session.user.id){
                        return new Response('You can not add yourself as a friend',{status:400})
                }

                //check if user is alredy added
                const isAlreadyAdded = (await fetchRedis(
                        'sismember',
                        `user:${idToAdd}:incoming_friend_requests`,
                        session.user.id)) as 0|1

                if(isAlreadyAdded){
                        return new Response('Already added this user',{status:400})
                }

                //check if user1 and user2 is already friend
                const isAlreadyFriends = (await fetchRedis(
                        'sismember',
                        `user:${session.user.id}:friends`,
                        idToAdd)) as 0|1

                if(isAlreadyFriends){
                        return new Response('Already friends with this user',{status:400})
                }



                await pusherServer.trigger(
                        toPusherKey(`user:${idToAdd}:incoming_friend_requests`),
                        'incoming_friend_requests',
                        {
                          senderId: session.user.id,
                          senderEmail: session.user.email,
                        }
                      )
                      

                //valid request,send freind request
                db.sadd(`user:${idToAdd}:incoming_friend_requests`,session.user.id)
                return new Response('Ok')
        } catch (error) {
                if (error instanceof z.ZodError) {
                        return new Response('Invalid request payload', { status: 422 })
                      }
                  
                      return new Response('Invalid request', { status: 400 })
                
        }
}