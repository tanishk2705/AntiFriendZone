'use client'

import Button from "@/components/ui/Button"
import { signOut } from "next-auth/react"



export default function Home() {
    
  return (
     <Button onClick={()=> signOut()} variant='ghost'>Sign out</Button>
  )
}
