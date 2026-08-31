import { NextResponse } from "next/server"

const COUNTER_KEY = "prt:s2k26:portal:accessi"
const START_VALUE = 1349

export async function GET() {
  try {
    const url = process.env.KV_REST_API_URL
    const token = process.env.KV_REST_API_TOKEN

    if (!url || !token) {
      return NextResponse.json(
        { error: "Redis configuration missing" },
        { status: 500 }
      )
    }

    const headers = {
      Authorization: `Bearer ${token}`,
    }

    const getResponse = await fetch(`${url}/get/${COUNTER_KEY}`, {
      headers,
      cache: "no-store",
    })

    const getData = await getResponse.json()
    const rawValue = getData?.result
    let currentValue = Number(rawValue)

    if (
      rawValue === null ||
      rawValue === undefined ||
      !Number.isFinite(currentValue) ||
      currentValue < START_VALUE
    ) {
      await fetch(`${url}/set/${COUNTER_KEY}/${START_VALUE}`, {
        headers,
        cache: "no-store",
      })

      currentValue = START_VALUE
    }

    const incrementResponse = await fetch(`${url}/incr/${COUNTER_KEY}`, {
      headers,
      cache: "no-store",
    })

    const incrementData = await incrementResponse.json()
    const count = Number(incrementData?.result)

    return NextResponse.json({ count })
  } catch (error) {
    console.error("Portal counter error:", error)

    return NextResponse.json(
      { error: "Counter unavailable" },
      { status: 500 }
    )
  }
}