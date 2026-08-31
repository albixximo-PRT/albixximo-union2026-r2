"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { toPng } from "html-to-image"

type ExtractRow = {
  posGara: number
  pilota: string
  auto: string
  tempoTotaleGara: string
  distaccoDalPrimo: string
  migliorGiroGara: string
  tempoQualifica: string
  pole?: string
}

type QualiRow = {
  pos: number
  pilota: string
  auto: string
  tempo: string
  distacco: string
}

type DisplayRow = ExtractRow & {
  sourcePosGara: number
}

type UnionMeta = {
  gara: string
  lobby: string
  lega: string
}

type ChampionshipLeagueKey = "ELITE" | "PLATINUM" | "MASTER" | "PRO" | "GT"

type SavedLeagueSnapshot = {
  savedAt: string
  league: ChampionshipLeagueKey
  raceNumber: number
  csv: string
  rows: ExtractRow[]
  finalRows: DisplayRow[]
  unionMeta: UnionMeta
  penalties: PenaltyMap
  lapOverrides: Record<string, string>
  dnfOverrides: DnfOverrideMap
  manualGaraOverride: string
  manualLegaOverride: string
  manualPilotOverrides: Record<number, string>
  manualAutoOverrides: Record<number, string>
  manualDistaccoOverrides: Record<number, string>
  manualQualiOverrides: Record<number, string>
  bestQuali: string
  bestRaceLap: string
  winner: string
}

type SavedRaceState = Partial<Record<ChampionshipLeagueKey, SavedLeagueSnapshot>>

type ChampionshipState = {
  races: Partial<Record<number, SavedRaceState>>
  roundMovements: Partial<Record<number, RoundMovementState>>
}

type DriverBaselineEntry = {
  pilota: string
  pointsAfterRace2: number
  league: ChampionshipLeagueKey
}

type ChampionshipCellStatus = "DNF" | "DNF-I" | "DNFV" | "DNP" | "BOX" | "DSQ"

type ChampionshipRaceCell = {
  position: number | null
  status: ChampionshipCellStatus | null
  pp: boolean
  gv: boolean
  points: number
  rawText?: string
  specialMovement?: "promote" | "relegate" | null
}

type DriverChampionshipRow = {
  pilota: string
  league: string
  baselinePoints: number
  racePoints: Record<number, number>
  raceResults: Partial<Record<number, ChampionshipRaceCell>>
  totalPoints: number
  racesCounted: number
}

type DriverLeagueMap = Record<ChampionshipLeagueKey, string[]>

type DriverAliasMap = Record<ChampionshipLeagueKey, Record<string, string>>
type DriverRatingPenalty =
  | "Sospeso per 1 gara"
  | "Sospeso per 2 gare"
  | "Squalificato"

type DriverRatingValue = number | DriverRatingPenalty

type MovementType = "promote" | "relegate"
type MovementDrawerAction = "move" | "swap" | "replace_remove"

type LeagueMovementEntry = {
  driverName: string
  fromLeague: ChampionshipLeagueKey
  toLeague: ChampionshipLeagueKey
  type: MovementType
  drawerAction: MovementDrawerAction
  targetDriverName: string | null
  basePointsOverride?: number | null
}

type RoundMovementState = Partial<Record<ChampionshipLeagueKey, LeagueMovementEntry[]>>

type UnresolvedDriverCandidate = {
  id: string
  rawName: string
  normalizedRawName: string
  league: ChampionshipLeagueKey
  suggestedOfficialName: string
  suggestedScore: number
}

type BackupFile = {
  version: number
  savedAt: string
  championshipState: ChampionshipState
  currentRace: number
  selectedLeague: ChampionshipLeagueKey
  exportTexts: {
    mainTitle: string
    sideLabel: string
    subtitle: string
  }
  driverBaselines: DriverBaselineEntry[]
  manualRace12Draft: Record<string, { g1: string; g2: string }>
  driverLeagueMap: DriverLeagueMap
  driverAliasMap: DriverAliasMap
  driverRatingMap: Record<string, DriverRatingValue>
  uploadedLeagueHtmls: Partial<Record<ChampionshipLeagueKey, string>>
}


type PenaltyEntry = {
  id: string
  code: string
  lap: string
  minute: string
  second: string
}

type PenaltyMap = Record<string, PenaltyEntry[]>
type DnfOverrideValue = "DNF" | "DNF-I" | "DNFV"
type DnfOverrideMap = Record<string, DnfOverrideValue>

const PRT_RACE_OPTIONS = [
  { value: 1, label: "Gara 1" },
  { value: 2, label: "Gara 2" },
  { value: 3, label: "Gara 3" },
  { value: 4, label: "Gara 4" },
  { value: 5, label: "Gara 5" },
  { value: 6, label: "Gara 6" },
  { value: 7, label: "Gara 7" },
  { value: 8, label: "Gara 8" },
  { value: 9, label: "Gara 9" },
  { value: 10, label: "Gara 10" },
  { value: 11, label: "Gara 11" },
  { value: 12, label: "Gara 12" },
  { value: 13, label: "Gara 13 • Finale di Campionato" },
] as const

const PRT_LEAGUES = ["ELITE", "PLATINUM", "MASTER", "PRO", "GT"] as const

type PrtLeague = typeof PRT_LEAGUES[number]

type PrtSavedLeagueSnapshot = {
  savedAt: string
  league: PrtLeague
  raceNumber: number
  finalRows: DisplayRow[]
  csv: string
  unionMeta: UnionMeta
  penalties: PenaltyMap
  lapOverrides: Record<string, string>
  dnfOverrides: DnfOverrideMap
  manualPilotOverrides: Record<number, string>
  manualAutoOverrides: Record<number, string>
  manualDistaccoOverrides: Record<number, string>
  bestQuali: string
  bestRaceLap: string
  winner: string
}

type PrtSavedRaceState = Partial<Record<PrtLeague, SavedLeagueSnapshot>>

type PrtChampionshipSnapshot = Partial<Record<number, SavedRaceState>>

type PenaltyEffect = "time" | "ammonition" | "dsq" | "other"

type PenaltyRule = {
  seconds: number
  effect: PenaltyEffect
  shortLabel: string
}

type MatchFieldStatus = "ok" | "warn" | "error"

type PrtMatchSummary = {
  overallStatus: "ok" | "warn" | "error"
  percentage: number
  fields: {
    posizione: MatchFieldStatus
    pilota: MatchFieldStatus
    auto: MatchFieldStatus
    distacchi: MatchFieldStatus
    pp: MatchFieldStatus
    gv: MatchFieldStatus
    gara: MatchFieldStatus
    lobby: MatchFieldStatus
    lega: MatchFieldStatus
  }
  notes: string[]
}

function statusBadge(status: MatchFieldStatus) {
  if (status === "ok") return "✅"
  if (status === "warn") return "⚠️"
  return "❌"
}

function overallBoxStyle(status: "ok" | "warn" | "error"): React.CSSProperties {
  if (status === "ok") {
    return {
      background: "rgba(34,197,94,0.14)",
      border: "1px solid rgba(34,197,94,0.45)",
      color: "#dcfce7",
    }
  }

  if (status === "warn") {
    return {
      background: "rgba(250,204,21,0.12)",
      border: "1px solid rgba(250,204,21,0.45)",
      color: "#fef3c7",
    }
  }

  return {
    background: "rgba(239,68,68,0.14)",
    border: "1px solid rgba(239,68,68,0.45)",
    color: "#fee2e2",
  }
}

function matchCellStyle(status: MatchFieldStatus): React.CSSProperties {
  if (status === "ok") {
    return {
      background: "linear-gradient(180deg, rgba(0,255,120,0.18), rgba(0,0,0,0.25))",
      border: "1px solid rgba(0,255,120,0.35)",
      boxShadow: "0 0 12px rgba(0,255,120,0.18)",
      color: "#ecfff5",
    }
  }

  if (status === "warn") {
    return {
      background: "linear-gradient(180deg, rgba(255,215,0,0.18), rgba(0,0,0,0.25))",
      border: "1px solid rgba(255,215,0,0.35)",
      boxShadow: "0 0 12px rgba(255,215,0,0.16)",
      color: "#fff8dc",
    }
  }

  return {
    background: "linear-gradient(180deg, rgba(255,80,80,0.18), rgba(0,0,0,0.25))",
      border: "1px solid rgba(255,80,80,0.35)",
      boxShadow: "0 0 12px rgba(255,80,80,0.14)",
      color: "#fff1f1",
    }
}

const PENALTY_RULES: Record<string, PenaltyRule> = {
  P01: { seconds: 0, effect: "ammonition", shortLabel: "00:00.000" },
  P02: { seconds: 5, effect: "time", shortLabel: "+5s" },
  P03: { seconds: 5, effect: "time", shortLabel: "+5s" },
  P04: { seconds: 10, effect: "time", shortLabel: "+10s" },
  P05: { seconds: 10, effect: "time", shortLabel: "+10s" },
  P06: { seconds: 15, effect: "time", shortLabel: "+15s" },
  P07: { seconds: 15, effect: "time", shortLabel: "+15s" },
  P08: { seconds: 20, effect: "time", shortLabel: "+20s" },
  P09: { seconds: 20, effect: "time", shortLabel: "+20s" },
  P10: { seconds: 25, effect: "time", shortLabel: "+25s" },
  P11: { seconds: 25, effect: "time", shortLabel: "+25s" },
  P12: { seconds: 30, effect: "time", shortLabel: "+30s" },
  P13: { seconds: 30, effect: "time", shortLabel: "+30s" },
  P14: { seconds: 35, effect: "time", shortLabel: "+35s" },
  P15: { seconds: 20, effect: "time", shortLabel: "+20s" },
  P16: { seconds: 0, effect: "dsq", shortLabel: "DSQ" },
  P17: { seconds: 10, effect: "time", shortLabel: "+10s" },
  P18: { seconds: 45, effect: "time", shortLabel: "+45s" },
  P19: { seconds: 5, effect: "time", shortLabel: "+5s" },
  P20: { seconds: 20, effect: "time", shortLabel: "+20s" },
  P21: { seconds: 30, effect: "time", shortLabel: "+30s" },
  P22: { seconds: 20, effect: "time", shortLabel: "+20s" },
  P23: { seconds: 10, effect: "time", shortLabel: "+10s" },
  P24: { seconds: 20, effect: "time", shortLabel: "+20s" },
  P25: { seconds: 0, effect: "ammonition", shortLabel: "00:00.000" },
  P26: { seconds: 5, effect: "time", shortLabel: "+5s" },
  P27: { seconds: 0, effect: "dsq", shortLabel: "DSQ" },
  P28: { seconds: 0, effect: "other", shortLabel: "-" },
  P29: { seconds: 60, effect: "time", shortLabel: "+60s" },
  P30: { seconds: 15, effect: "time", shortLabel: "+15s" },
  P31: { seconds: 0, effect: "ammonition", shortLabel: "00:00.000" },
  P32: { seconds: 60, effect: "time", shortLabel: "+60s" },
  P33: { seconds: 10, effect: "time", shortLabel: "+10s" },
  P34: { seconds: 10, effect: "time", shortLabel: "+10s" },
  P35: { seconds: 0, effect: "dsq", shortLabel: "DSQ" },
  P36: { seconds: 15, effect: "time", shortLabel: "+15s" },
  P37: { seconds: 0, effect: "other", shortLabel: "-" },
  P38: { seconds: 20, effect: "time", shortLabel: "+20s" },
  P39: { seconds: 20, effect: "time", shortLabel: "+20s" },
  DSQ: { seconds: 0, effect: "dsq", shortLabel: "DSQ" },
}

const AMMONITION_CODES = new Set(["P01", "P25", "P31"])
const DSQ_CODES = new Set(["P16", "P27", "P35", "DSQ"])

const NEW_PENALTY_RULES: Record<string, PenaltyRule> = {
  P01: { seconds: 0, effect: "ammonition", shortLabel: "00:00.000" },
  P02: { seconds: 5, effect: "time", shortLabel: "+5s" },
  P03: { seconds: 10, effect: "time", shortLabel: "+10s" },
  P04: { seconds: 15, effect: "time", shortLabel: "+15s" },
  P05: { seconds: 20, effect: "time", shortLabel: "+20s" },
  P06: { seconds: 25, effect: "time", shortLabel: "+25s" },
  P07: { seconds: 30, effect: "time", shortLabel: "+30s" },
  P08: { seconds: 5, effect: "time", shortLabel: "+5s" },
  P09: { seconds: 15, effect: "time", shortLabel: "+15s" },
  P10: { seconds: 20, effect: "time", shortLabel: "+20s" },
  P11: { seconds: 0, effect: "dsq", shortLabel: "SQ CAMP." },
  P12: { seconds: 40, effect: "time", shortLabel: "+40s" },
  P13: { seconds: 5, effect: "time", shortLabel: "+5s" },
  P14: { seconds: 10, effect: "time", shortLabel: "+10s" },
  P15: { seconds: 10, effect: "time", shortLabel: "+10s" },
  P16: { seconds: 20, effect: "time", shortLabel: "+20s" },
  P17: { seconds: 20, effect: "time", shortLabel: "+20s" },
  P18: { seconds: 20, effect: "time", shortLabel: "+20s" },
  P19: { seconds: 30, effect: "time", shortLabel: "+30s" },
  P20: { seconds: 20, effect: "time", shortLabel: "+20s" },
  P21: { seconds: 0, effect: "other", shortLabel: "SQ QUAL." },
  P22: { seconds: 20, effect: "time", shortLabel: "+20s" },
  P23: { seconds: 0, effect: "ammonition", shortLabel: "00:00.000" },
  P24: { seconds: 5, effect: "time", shortLabel: "+5s" },
  P25: { seconds: 0, effect: "dsq", shortLabel: "SQ CAMP." },
  P26: { seconds: 0, effect: "ammonition", shortLabel: "00:00.000" },
  P27: { seconds: 60, effect: "time", shortLabel: "+60s" },
  P28: { seconds: 15, effect: "time", shortLabel: "+15s" },
  P29: { seconds: 0, effect: "ammonition", shortLabel: "00:00.000" },
  P30: { seconds: 5, effect: "time", shortLabel: "+5s" },
  P31: { seconds: 0, effect: "dsq", shortLabel: "DSQ" },
  P32: { seconds: 15, effect: "time", shortLabel: "+15s" },
  DSQ: { seconds: 0, effect: "dsq", shortLabel: "DSQ" },
}

const RACE8_PENALTY_RULES: Record<string, PenaltyRule> = {
  P01: { seconds: 0, effect: "ammonition", shortLabel: "00:00.000" },
  P02: { seconds: 5, effect: "time", shortLabel: "+5s" },
  P03: { seconds: 10, effect: "time", shortLabel: "+10s" },
  P04: { seconds: 15, effect: "time", shortLabel: "+15s" },
  P05: { seconds: 20, effect: "time", shortLabel: "+20s" },
  P06: { seconds: 25, effect: "time", shortLabel: "+25s" },
  P07: { seconds: 30, effect: "time", shortLabel: "+30s" },
  P08: { seconds: 5, effect: "time", shortLabel: "+5s" },
  P09: { seconds: 10, effect: "time", shortLabel: "+10s" },
  P10: { seconds: 15, effect: "time", shortLabel: "+15s" },
  P11: { seconds: 0, effect: "dsq", shortLabel: "SQ CAMP." },
  P12: { seconds: 10, effect: "time", shortLabel: "+10s" },
  P13: { seconds: 5, effect: "time", shortLabel: "+5s" },
  P14: { seconds: 15, effect: "time", shortLabel: "+15s" },
  P15: { seconds: 15, effect: "time", shortLabel: "+15s" },
  P16: { seconds: 15, effect: "time", shortLabel: "+15s" },
  P17: { seconds: 30, effect: "time", shortLabel: "+30s" },
  P18: { seconds: 15, effect: "time", shortLabel: "+15s" },
  P19: { seconds: 0, effect: "other", shortLabel: "SQ QUAL. SUCC." },
  P20: { seconds: 20, effect: "time", shortLabel: "+20s" },
  P21: { seconds: 0, effect: "ammonition", shortLabel: "00:00.000" },
  P22: { seconds: 30, effect: "time", shortLabel: "+30s" },
  P23: { seconds: 0, effect: "dsq", shortLabel: "SQ CAMP." },
  P24: { seconds: 0, effect: "ammonition", shortLabel: "00:00.000" },
  P25: { seconds: 60, effect: "time", shortLabel: "+60s" },
  P26: { seconds: 15, effect: "time", shortLabel: "+15s" },
  P27: { seconds: 0, effect: "ammonition", shortLabel: "00:00.000" },
  P28: { seconds: 5, effect: "time", shortLabel: "+5s" },
  P29: { seconds: 0, effect: "dsq", shortLabel: "SQ LOBBY" },
  P30: { seconds: 0, effect: "dsq", shortLabel: "SQ GARA" },
  P31: { seconds: 15, effect: "time", shortLabel: "+15s" },
  DSQ: { seconds: 0, effect: "dsq", shortLabel: "DSQ" },
}

const NEW_AMMONITION_CODES = new Set(["P01", "P23", "P26", "P29"])
const NEW_DSQ_CODES = new Set(["P11", "P25", "P31", "DSQ"])
const RACE8_AMMONITION_CODES = new Set(["P01", "P21", "P24", "P27"])
const RACE8_DSQ_CODES = new Set(["P11", "P23", "P29", "P30", "DSQ"])
const RACE8_PENALTY_DESCRIPTIONS: Record<string, string> = {
  P01: "Contatto con perdita di posizioni (0)",
  P02: "Contatto con perdita di posizioni (1-2)",
  P03: "Contatto con perdita di posizioni (3-4)",
  P04: "Contatto con perdita di posizioni (5-6)",
  P05: "Contatto con perdita di posizioni (7-8)",
  P06: "Contatto con perdita di posizioni (9-10)",
  P07: "Contatto con perdita di posizioni (11-14)",
  P08: "In aggiunta da P01 a P07 con danni ridotti",
  P09: "In aggiunta da P01 a P07 con danni realistici",
  P10: "In aggiunta da P01 a P07 non restituendo posizione",
  P11: "Collisione volontaria",
  P12: "In aggiunta da P01 a P10 per manovra aggressiva in Curva 1",
  P13: "Effettuare più di un cambio di traiettoria difensiva in rettilineo",
  P14: "Cambio di traiettoria improvviso o in fase di frenata",
  P15: "Ottenimento della posizione mediante sorpasso scorretto",
  P16: "Mancato rispetto delle bandiere blu",
  P17: "Provocare bandiera gialla fissa",
  P18: "Rientro in pista pericoloso con incidente o intralcio",
  P19: "Velocità troppo bassa in pista",
  P20: "Rallentamento ingiustificato su tratti ad alta velocità",
  P21: "Guida scorretta generica",
  P22: "Uso improprio della chat durante Qualifica/Gara",
  P23: "Insulti in chat/party audio/canali Discord",
  P24: "Rientro ai box tasto OPTION durante Qualifica senza ripartenza",
  P25: "Rientro ai box tasto OPTION durante Qualifica con ripartenza",
  P26: "Rientro in lobby dopo abbandono Gara (inclusi crash)",
  P27: "Mancata pubblicazione screenshot Qualifiche/Gara e/o Replay Gara",
  P28: "Errato o mancato utilizzo degli elementi grafici ufficiali PRT",
  P29: "Restart della Lobby non previsto dal Regolamento",
  P30: "Livree o adesivi offensivi - Comportamenti antisportivi",
  P31: "Raggiunte 3 ammonizioni",
}

function getPointsForPrtRow(r: ExtractRow, bestRaceLap: string): number {
  const basePointsMap: Record<number, number> = {
    1: 30,
    2: 27,
    3: 24,
    4: 22,
    5: 20,
    6: 18,
    7: 16,
    8: 14,
    9: 12,
    10: 9,
    11: 7,
    12: 5,
    13: 3,
    14: 1,
  }

  const isPole = (r.pole || "").trim().toUpperCase() === "POLE"
  const bestLapTime = (bestRaceLap.split("  ").pop() || "").trim()
  const isBestLap = !!bestLapTime && (r.migliorGiroGara || "").trim() === bestLapTime

  let points = basePointsMap[r.posGara] ?? 0

  if (isPole) points += 1
  if (isBestLap) points += 1

  return points
}

function TableCell({
  children,
  align,
  mono,
  dim,
  style,
  exporting = false,
}: {
  children: React.ReactNode
  align?: "left" | "center" | "right"
  mono?: boolean
  dim?: boolean
  style?: React.CSSProperties
  exporting?: boolean
}) {
  return (
    <td
      style={{
        padding: exporting ? "9px 9px" : "8px 6px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        textAlign: align ?? "left",
        fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" : undefined,
        fontSize: exporting ? 13 : 12,
        opacity: dim ? 0.75 : 0.95,
        verticalAlign: "middle",
        ...style,
      }}
    >
      {children}
    </td>
  )
}

function parseMmSsMmm(s: string): number | null {
  const m = s.match(/^(\d+):(\d{2})\.(\d{3})$/)
  if (!m) return null
  const mm = Number(m[1])
  const ss = Number(m[2])
  const ms = Number(m[3])
  if ([mm, ss, ms].some(Number.isNaN)) return null
  return (mm * 60 + ss) * 1000 + ms
}

function parseAbsoluteRaceTimeMs(s: string): number | null {
  const t = (s || "").trim()
  if (!t) return null
  if (t.startsWith("+")) return null
  if (/^(DNF|DNF-I|DNFV|BOX|DSQ)$/i.test(t)) return null
  if (/^\d+giro$/i.test(t)) return null

  const hms = t.match(/^(\d+):(\d{2}):(\d{2})\.(\d{3})$/)
  if (hms) {
    const hh = Number(hms[1])
    const mm = Number(hms[2])
    const ss = Number(hms[3])
    const ms = Number(hms[4])
    if ([hh, mm, ss, ms].some(Number.isNaN)) return null
    return (hh * 3600 + mm * 60 + ss) * 1000 + ms
  }

  const msOnly = t.match(/^(\d+):(\d{2})\.(\d{3})$/)
  if (msOnly) {
    const mm = Number(msOnly[1])
    const ss = Number(msOnly[2])
    const ms = Number(msOnly[3])
    if ([mm, ss, ms].some(Number.isNaN)) return null
    return (mm * 60 + ss) * 1000 + ms
  }

  return null
}

function parseGapToMs(s: string): number | null {
  const raw = (s || "").trim()
  if (!raw) return null

  const t = raw.replace(/\s+/g, "")
  if (!t.startsWith("+")) return null

  const body = t.slice(1)

  const mmss = body.match(/^(\d+):(\d{2})\.(\d{3})$/)
  if (mmss) {
    const mm = Number(mmss[1])
    const ss = Number(mmss[2])
    const ms = Number(mmss[3])
    if ([mm, ss, ms].some(Number.isNaN)) return null
    return (mm * 60 + ss) * 1000 + ms
  }

  const ssOnly = body.match(/^(\d{1,2})\.(\d{3})$/)
  if (ssOnly) {
    const ss = Number(ssOnly[1])
    const ms = Number(ssOnly[2])
    if ([ss, ms].some(Number.isNaN)) return null
    return ss * 1000 + ms
  }

  return null
}

function parseManualLeaderGapInputMs(s: string): number | null {
  const t = (s || "").trim()
  if (!t) return null

  const mmss = t.match(/^(\d+):(\d{2})\.(\d{3})$/)
  if (!mmss) return null

  const mm = Number(mmss[1])
  const ss = Number(mmss[2])
  const ms = Number(mmss[3])

  if ([mm, ss, ms].some(Number.isNaN)) return null
  return (mm * 60 + ss) * 1000 + ms
}

function formatAbsoluteRaceTime(ms: number): string {
  const totalMs = Math.max(0, Math.round(ms))
  const hours = Math.floor(totalMs / 3600000)
  const minutes = Math.floor((totalMs % 3600000) / 60000)
  const seconds = Math.floor((totalMs % 60000) / 1000)
  const millis = totalMs % 1000

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`
  }

  const totalMinutes = Math.floor(totalMs / 60000)
  return `${totalMinutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`
}

function formatGapFromLeader(ms: number): string {
  const totalMs = Math.max(0, Math.round(ms))
  const totalMinutes = Math.floor(totalMs / 60000)
  const seconds = Math.floor((totalMs % 60000) / 1000)
  const millis = totalMs % 1000

  if (totalMinutes > 0) {
    return `+${totalMinutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`
  }

  return `+${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`
}

function formatPenaltyDisplay(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds || 0))
  const mm = Math.floor(safe / 60)
  const ss = safe % 60
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}.000`
}

function formatPenaltyOptionLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} secondi`

  const mm = Math.floor(seconds / 60)
  const ss = seconds % 60

  if (ss === 0) {
    return mm === 1 ? "1 minuto" : `${mm} minuti`
  }

  if (mm === 1) {
    return `1 minuto e ${ss} secondi`
  }

  return `${mm} minuti e ${ss} secondi`
}

function getPenaltyRulesForRace(raceNumber: number) {
  if (raceNumber >= 8) return RACE8_PENALTY_RULES
  if (raceNumber >= 6) return NEW_PENALTY_RULES
  return PENALTY_RULES
}

function getAmmonitionCodesForRace(raceNumber: number) {
  if (raceNumber >= 8) return RACE8_AMMONITION_CODES
  if (raceNumber >= 6) return NEW_AMMONITION_CODES
  return AMMONITION_CODES
}

function getDsqCodesForRace(raceNumber: number) {
  if (raceNumber >= 8) return RACE8_DSQ_CODES
  if (raceNumber >= 6) return NEW_DSQ_CODES
  return DSQ_CODES
}

function getPenaltyRule(code: string, raceNumber: number): PenaltyRule {
  const rules = getPenaltyRulesForRace(raceNumber)
  return rules[code] || { seconds: 0, effect: "other", shortLabel: "-" }
}

function penaltySecondsFromCode(code: string, raceNumber: number): number {
  return getPenaltyRule(code, raceNumber).seconds
}

function hasDsqPenalty(entries: PenaltyEntry[] = [], raceNumber: number): boolean {
  const dsqCodes = getDsqCodesForRace(raceNumber)
  return entries.some((entry) => dsqCodes.has(entry.code))
}

function hasAmmonitionPenalty(entries: PenaltyEntry[] = [], raceNumber: number): boolean {
  const ammonitionCodes = getAmmonitionCodesForRace(raceNumber)
  return entries.some((entry) => ammonitionCodes.has(entry.code))
}

function totalPenaltySeconds(entries: PenaltyEntry[] = [], raceNumber: number): number {
  return entries.reduce((sum, entry) => sum + penaltySecondsFromCode(entry.code, raceNumber), 0)
}

function createPenaltyEntry(): PenaltyEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    code: "",
    lap: "Lap 01",
    minute: "00",
    second: "00",
  }
}

function formatPenaltyDetail(entry: PenaltyEntry): string {
  if (entry.lap === "Lap -") {
    return `${entry.code} Lap - --:--`
  }

  return `${entry.code} ${entry.lap} ${entry.minute}:${entry.second}`
}

function getPenaltyOptionText(code: string, raceNumber: number): string {
  const rule = getPenaltyRule(code, raceNumber)

  const sanction =
    rule.effect === "ammonition"
      ? "Ammonizione"
      : rule.effect === "dsq" || rule.effect === "other"
        ? rule.shortLabel
        : `+${rule.seconds} sec`

  if (raceNumber >= 8 && code !== "DSQ") {
    const description = RACE8_PENALTY_DESCRIPTIONS[code]

    if (description) {
      return `${code} - ${description} - ${sanction}`
    }
  }

  if (rule.effect === "ammonition") return `${code} (Ammonizione)`
  if (rule.effect === "dsq") return `${code} (${rule.shortLabel})`
  if (rule.effect === "other") return `${code} (${rule.shortLabel})`

  return `${code} (${formatPenaltyOptionLabel(rule.seconds)})`
}

function getPenaltyMainDisplay(entries: PenaltyEntry[] = [], raceNumber: number): {
  kind: "none" | "time" | "ammonition" | "dsq"
  text: string
} {
  if (!entries.length) return { kind: "none", text: "-" }
  if (hasDsqPenalty(entries, raceNumber)) return { kind: "dsq", text: "DSQ" }

  const total = totalPenaltySeconds(entries, raceNumber)
  if (total > 0) return { kind: "time", text: formatPenaltyDisplay(total) }

  if (hasAmmonitionPenalty(entries, raceNumber)) {
    return { kind: "ammonition", text: "00:00.000" }
  }

  return { kind: "none", text: "-" }
}

function tempoLikeGt7(r: ExtractRow) {
  if (r.posGara === 1) return r.tempoTotaleGara || "-"
  return r.distaccoDalPrimo || "-"
}

function normalizePilot(s: string) {
  return (s || "").trim().toLowerCase()
}

function getPrtRowStableKey(sourcePosGara: number) {
  return `row-${sourcePosGara}`
}

function normalizeLeagueKey(value: string): ChampionshipLeagueKey | null {
  const v = String(value || "").trim().toUpperCase()

  if (v === "ELITE") return "ELITE"
  if (v === "PLATINUM") return "PLATINUM"
  if (v === "MASTER") return "MASTER"
  if (v === "PRO") return "PRO"
  if (v === "GT") return "GT"

  return null
}

const DRIVER_ENTRY_RACE: Record<string, number> = {
  krasam23: 7,
  step87: 8,
}

function getDriverEntryRace(driverName: string) {
  const key = normalizeDriverLookupName(driverName)
  return DRIVER_ENTRY_RACE[key] ?? 3
}

function normalizeDriverLookupName(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

function applyQualiRaceAliasToRows(
  rows: ExtractRow[],
  qualiRows: QualiRow[],
  fromQualiName: string,
  toRaceName: string
): ExtractRow[] {
  const quali = qualiRows.find(
    (q) => normalizeDriverLookupName(q.pilota) === normalizeDriverLookupName(fromQualiName)
  )

  if (!quali) return rows

  return rows.map((row) => {
    const isTargetRacePilot =
      normalizeDriverLookupName(row.pilota) === normalizeDriverLookupName(toRaceName)

    const isOldPole =
      (row.pole || "").trim().toUpperCase() === "POLE"

    return {
      ...row,
      tempoQualifica: isTargetRacePilot ? quali.tempo : row.tempoQualifica,
      pole: isTargetRacePilot ? "POLE" : isOldPole ? "" : row.pole,
    }
  })
}

function levenshteinDistance(a: string, b: string): number {
  const aa = String(a || "")
  const bb = String(b || "")

  if (aa === bb) return 0
  if (!aa.length) return bb.length
  if (!bb.length) return aa.length

  const matrix = Array.from({ length: aa.length + 1 }, () =>
    Array(bb.length + 1).fill(0)
  )

  for (let i = 0; i <= aa.length; i++) matrix[i][0] = i
  for (let j = 0; j <= bb.length; j++) matrix[0][j] = j

  for (let i = 1; i <= aa.length; i++) {
    for (let j = 1; j <= bb.length; j++) {
      const cost = aa[i - 1] === bb[j - 1] ? 0 : 1

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[aa.length][bb.length]
}

function computeDriverSimilarityScore(rawName: string, officialName: string) {
  const raw = normalizeDriverLookupName(rawName)
  const official = normalizeDriverLookupName(officialName)

  if (!raw || !official) return 0
  if (raw === official) return 1

  const rawInOfficial = official.includes(raw)
  const officialInRaw = raw.includes(official)

  if (rawInOfficial || officialInRaw) {
    const shorter = Math.min(raw.length, official.length)
    const longer = Math.max(raw.length, official.length)
    const ratio = shorter / longer

    if (shorter >= 5 && ratio >= 0.45) {
      return 0.96 + Math.min(0.03, ratio * 0.03)
    }
  }

  const distance = levenshteinDistance(raw, official)
  const maxLen = Math.max(raw.length, official.length)
  let score = 1 - distance / maxLen

  if (raw[0] === official[0]) score += 0.02
  if (raw.slice(0, 4) === official.slice(0, 4)) score += 0.03
  if (raw.slice(-2) === official.slice(-2)) score += 0.02

  return Math.min(score, 0.99)
}

function findBestOfficialPilotMatch(
  rawName: string,
  officialPilots: string[]
): {
  officialName: string
  score: number
  isSafeAutoMatch: boolean
} | null {
  const raw = normalizeDriverLookupName(rawName)
  if (!raw) return null

  const ranked = officialPilots
    .map((pilot) => ({
      officialName: pilot,
      normalized: normalizeDriverLookupName(pilot),
      score: computeDriverSimilarityScore(rawName, pilot),
    }))
    .filter((item) => item.normalized)
    .sort((a, b) => b.score - a.score)

  const best = ranked[0]
  const second = ranked[1]

  if (!best) return null

  const exact = raw === best.normalized
  const rawContained = best.normalized.includes(raw) || raw.includes(best.normalized)

  let minScore = 0.88
  if (raw.length >= 8) minScore = 0.80
  else if (raw.length >= 5) minScore = 0.85
  else minScore = 0.93

  if (rawContained && raw.length >= 5) {
    minScore = Math.min(minScore, 0.90)
  }

  const gap = second ? best.score - second.score : 1
  const minGap = best.score >= 0.96 ? 0.02 : 0.06

  const isSafeAutoMatch =
    exact ||
    (
      best.score >= minScore &&
      (gap >= minGap || !second)
    )

  return {
    officialName: best.officialName,
    score: best.score,
    isSafeAutoMatch,
  }
}

function isDoppiatoValue(value: string) {
  const t = (value || "").trim().toUpperCase()
  return /^\d+GIRO$/i.test(t) || t === "DOPPIATO"
}

function parseCsvLine(line: string) {
  const out: string[] = []
  let cur = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (ch === "," && !inQuotes) {
      out.push(cur)
      cur = ""
      continue
    }

    cur += ch
  }

  out.push(cur)
  return out.map((v) => v.trim())
}

function csvEscape(value: string | number) {
  const s = String(value ?? "")
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function parseCsvRows(csv: string): ExtractRow[] {
  const text = (csv || "").trim()
  if (!text) return []

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const header = parseCsvLine(lines[0])
  const idx = {
    posGara: header.indexOf("posGara"),
    pilota: header.indexOf("pilota"),
    auto: header.indexOf("auto"),
    tempoTotaleGara: header.indexOf("tempoTotaleGara"),
    distaccoDalPrimo: header.indexOf("distaccoDalPrimo"),
    migliorGiroGara: header.indexOf("migliorGiroGara"),
    tempoQualifica: header.indexOf("tempoQualifica"),
    pole: header.indexOf("pole"),
  }

  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line)
    const posRaw = idx.posGara >= 0 ? cols[idx.posGara] ?? "" : ""
    const posNum = Number(posRaw)

    return {
      posGara: Number.isFinite(posNum) ? posNum : 0,
      pilota: idx.pilota >= 0 ? cols[idx.pilota] ?? "" : "",
      auto: idx.auto >= 0 ? cols[idx.auto] ?? "" : "",
      tempoTotaleGara: idx.tempoTotaleGara >= 0 ? cols[idx.tempoTotaleGara] ?? "" : "",
      distaccoDalPrimo: idx.distaccoDalPrimo >= 0 ? cols[idx.distaccoDalPrimo] ?? "" : "",
      migliorGiroGara: idx.migliorGiroGara >= 0 ? cols[idx.migliorGiroGara] ?? "" : "",
      tempoQualifica: idx.tempoQualifica >= 0 ? cols[idx.tempoQualifica] ?? "" : "",
      pole: idx.pole >= 0 ? cols[idx.pole] ?? "" : "",
    }
  })
}

function buildCsvFromRows(rows: ExtractRow[], unionMeta: UnionMeta) {
  const header = ["#", "Nome pilota", "Auto", "Distacchi", "-PP-", "-GV-", "Gara", "Lobby", "Lega"]

  const bestRaceLapMs = rows.reduce<number | null>((best, r) => {
    const ms = parseMmSsMmm((r.migliorGiroGara || "").trim())
    if (ms == null) return best
    if (best == null || ms < best) return ms
    return best
  }, null)

  const body = rows.map((r) => {
    const isPole = (r.pole || "").trim().toUpperCase() === "POLE"
    const raceLapMs = parseMmSsMmm((r.migliorGiroGara || "").trim())
    const isBestLap = bestRaceLapMs != null && raceLapMs != null && raceLapMs === bestRaceLapMs

    const distacco =
      r.posGara === 1
        ? (r.tempoTotaleGara || "-")
        : (r.distaccoDalPrimo || "-")

    return [
      csvEscape(r.posGara),
      csvEscape(r.pilota || ""),
      csvEscape(r.auto || ""),
      csvEscape(distacco),
      csvEscape(isPole ? "PP" : ""),
      csvEscape(isBestLap ? "GV" : ""),
      csvEscape(unionMeta.gara || ""),
      csvEscape(unionMeta.lobby || ""),
      csvEscape(unionMeta.lega || ""),
    ].join(",")
  })

  return [header.join(","), ...body].join("\n")
}

function isNonComparableRaceValue(value: string) {
  const t = (value || "").trim()
  if (!t) return true
  if (/^(DNF|DNF-I|DNFV|DNP|BOX|DSQ)$/i.test(t)) return true
  if (/^\d+giro$/i.test(t)) return true
  if (/^DOPPIATO$/i.test(t)) return true
  return false
}

function isRowComparable(row: ExtractRow, leaderMs: number | null) {
  if (leaderMs == null) return false

  const tempoShown = tempoLikeGt7(row)
  if (isNonComparableRaceValue(tempoShown)) return false

  if (row.posGara === 1) {
    return parseAbsoluteRaceTimeMs(row.tempoTotaleGara) != null
  }

  const abs = parseAbsoluteRaceTimeMs(row.tempoTotaleGara)
  if (abs != null) return true

  return parseGapToMs(row.distaccoDalPrimo) != null
}

function resolveComparableRaceMs(row: ExtractRow, leaderMs: number) {
  if (row.posGara === 1) {
    return parseAbsoluteRaceTimeMs(row.tempoTotaleGara)
  }

  const abs = parseAbsoluteRaceTimeMs(row.tempoTotaleGara)
  if (abs != null) return abs

  const gap = parseGapToMs(row.distaccoDalPrimo)
  if (gap != null) return leaderMs + gap

  return null
}
function HeaderBadge({
  label,
  value,
  variant,
  exporting = false,
}: {
  label: string
  value: string
  variant: "gold" | "violet" | "silver"
  exporting?: boolean
}) {
  const palette =
    variant === "gold"
      ? {
          border: "rgba(255,215,0,0.70)",
          glow: "rgba(255,215,0,0.16)",
          tagBg: "rgba(255,215,0,0.10)",
          tagBorder: "rgba(255,215,0,0.28)",
          tagText: "#ffe58a",
        }
      : variant === "silver"
        ? {
            border: "rgba(210,215,225,0.72)",
            glow: "rgba(210,215,225,0.18)",
            tagBg: "rgba(210,215,225,0.10)",
            tagBorder: "rgba(210,215,225,0.24)",
            tagText: "#f3f6fb",
          }
        : {
            border: "rgba(160,90,255,0.70)",
            glow: "rgba(160,90,255,0.14)",
            tagBg: "rgba(160,90,255,0.10)",
            tagBorder: "rgba(160,90,255,0.28)",
            tagText: "#dfc2ff",
          }

  const rawValue = String(value || "").trim()
  const parts = rawValue.split(/\s{2,}/)
  const mainValue = parts[0] || "-"
  const secondaryValue = parts[1] || ""

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: exporting ? 12 : 10,
        flexWrap: "nowrap",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: exporting
            ? variant === "silver"
              ? "10px 16px"
              : "9px 14px"
            : variant === "silver"
              ? "8px 12px"
              : "7px 11px",
          borderRadius: 999,
          border: `1px solid ${palette.border}`,
          background: "rgba(0,0,0,0.20)",
          boxShadow: `0 0 22px ${palette.glow}`,
          color: "white",
          fontWeight: 900,
          fontSize: exporting
            ? variant === "silver"
              ? 15
              : 14
            : variant === "silver"
              ? 13
              : 12,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {label}
      </span>

      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: exporting ? 8 : 7,
          color: "white",
          whiteSpace: "nowrap",
          flexShrink: 0,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        }}
      >
        <span
          style={{
            fontWeight: 900,
            fontSize: exporting ? 16 : 14,
            letterSpacing: 0.2,
          }}
        >
          {mainValue || "-"}
        </span>

        {secondaryValue ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: exporting ? "4px 10px" : "3px 8px",
              borderRadius: 999,
              background: palette.tagBg,
              border: `1px solid ${palette.tagBorder}`,
              color: palette.tagText,
              fontWeight: 800,
              fontSize: exporting ? 13 : 11,
              letterSpacing: 0.15,
              fontVariantNumeric: "tabular-nums",
              boxShadow: `0 0 12px ${palette.glow}`,
              lineHeight: 1,
            }}
          >
            {secondaryValue}
          </span>
        ) : null}
      </span>
    </div>
  )
}

function Separator({ exporting = false }: { exporting?: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 2,
        height: exporting ? 32 : 30,
        margin: exporting ? "0 12px" : "0 10px",
        borderRadius: 2,
        background: "linear-gradient(to bottom, transparent, rgba(210,215,225,0.9), transparent)",
        boxShadow: "0 0 6px rgba(210,215,225,0.35)",
        flexShrink: 0,
      }}
    />
  )
}

function Pill({
  left,
  right,
  variant,
  exporting = false,
  compact = false,
}: {
  left: string
  right?: string
  variant: "gold" | "violet" | "orange" | "teal" | "fuchsia" | "dsq" | "dnp"
  exporting?: boolean
  compact?: boolean
}) {
  const styles: Record<typeof variant, React.CSSProperties> = {
    gold: {
      background: "rgba(255,215,0,0.92)",
      border: "1px solid rgba(255,215,0,0.55)",
      boxShadow: "0 0 22px rgba(255,215,0,0.20)",
    },
    violet: {
      background: "rgba(160,90,255,0.92)",
      border: "1px solid rgba(160,90,255,0.55)",
      boxShadow: "0 0 22px rgba(160,90,255,0.18)",
    },
    orange: {
      background: "rgba(255,165,0,0.92)",
      border: "1px solid rgba(255,165,0,0.55)",
      boxShadow: "0 0 22px rgba(255,165,0,0.16)",
    },
    teal: {
      background: "rgba(64,224,208,0.92)",
      border: "1px solid rgba(64,224,208,0.55)",
      boxShadow: "0 0 22px rgba(64,224,208,0.14)",
    },
    fuchsia: {
      background: "rgba(255,0,128,0.92)",
      border: "1px solid rgba(255,0,128,0.55)",
      boxShadow: "0 0 22px rgba(255,0,128,0.18)",
    },
    dsq: {
      background: "rgba(255,0,255,0.92)",
      border: "1px solid rgba(255,0,255,0.60)",
      boxShadow: "0 0 22px rgba(255,0,255,0.30)",
    },
    dnp: {
      background: "rgba(144,238,144,0.92)",
      border: "1px solid rgba(144,238,144,0.58)",
      boxShadow: "0 0 22px rgba(144,238,144,0.18)",
    },
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: exporting && compact ? 8 : exporting ? 12 : 10,

        padding:
          exporting && compact
            ? "6px 12px"
            : exporting
              ? "10px 16px"
              : "8px 12px",

        borderRadius: 14,

        fontSize:
          exporting && compact
            ? 12
            : exporting
              ? 14
              : 13,

        fontWeight: 900,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        color:
  variant === "dsq" || variant === "fuchsia"
    ? "#ffffff"
    : "rgba(0,0,0,0.92)",
        ...styles[variant],
      }}
    >
      <span>{left}</span>

      {right ? (
        <span
          style={{
            paddingLeft: exporting && compact ? 8 : 10,
            borderLeft: "1px solid rgba(0,0,0,0.22)",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            letterSpacing: 0.2,
            textTransform: "none",

            fontSize:
              exporting && compact
                ? 13
                : exporting
                  ? 15
                  : 12,
          }}
        >
          {right}
        </span>
      ) : null}
    </span>
  )
}

function PosBadge({ pos }: { pos: number }) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 28,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.22)",
    fontSize: 16,
    lineHeight: 1,
    userSelect: "none",
  }

  if (pos === 1) {
    return (
      <span
        title="P1"
        style={{
          ...base,
          borderColor: "rgba(255,215,0,0.40)",
          boxShadow: "0 0 22px rgba(255,215,0,0.16)",
        }}
      >
        🥇
      </span>
    )
  }

  if (pos === 2) {
    return (
      <span
        title="P2"
        style={{
          ...base,
          borderColor: "rgba(220,220,220,0.30)",
          boxShadow: "0 0 18px rgba(220,220,220,0.10)",
        }}
      >
        🥈
      </span>
    )
  }

  if (pos === 3) {
    return (
      <span
        title="P3"
        style={{
          ...base,
          borderColor: "rgba(205,127,50,0.35)",
          boxShadow: "0 0 18px rgba(205,127,50,0.12)",
        }}
      >
        🥉
      </span>
    )
  }

  return (
    <span
      title={`P${pos}`}
      style={{
        ...base,
        fontSize: 12,
        fontWeight: 900,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        opacity: 0.9,
      }}
    >
      {pos}
    </span>
  )
}

function rowStyleForPos(pos: number, fallback: string): React.CSSProperties {
  if (pos === 1) {
    return {
      background:
        "linear-gradient(90deg, rgba(255,215,0,0.11) 0%, rgba(255,215,0,0.05) 28%, rgba(255,255,255,0.02) 70%)",
    }
  }
  if (pos === 2) {
    return {
      background:
        "linear-gradient(90deg, rgba(220,220,220,0.10) 0%, rgba(220,220,220,0.04) 28%, rgba(255,255,255,0.02) 70%)",
    }
  }
  if (pos === 3) {
    return {
      background:
        "linear-gradient(90deg, rgba(205,127,50,0.12) 0%, rgba(205,127,50,0.05) 28%, rgba(255,255,255,0.02) 70%)",
    }
  }
  return { background: fallback }
}

function renderTempoCell(tempo: string, exporting = false, compact = false) {
  const t = (tempo || "").trim()
  const upper = t.toUpperCase()

  if (!t || t === "-") return "-"

  if (upper === "DNF") {
    return <Pill left="DNF" variant="teal" exporting={exporting} compact={compact} />
  }

  if (upper === "DNF-I") {
    return <Pill left="DNF-I" variant="teal" exporting={exporting} compact={compact} />
  }

  if (upper === "DNFV") {
    return <Pill left="DNFV" variant="teal" exporting={exporting} compact={compact} />
  }

  if (upper === "BOX") {
    return <Pill left="BOX" variant="fuchsia" exporting={exporting} compact={compact} />
  }

  if (/^\d+giro$/i.test(t) || upper === "DOPPIATO") {
    return <Pill left="DOPPIATO" variant="orange" exporting={exporting} compact={compact} />
  }

  if (upper === "DSQ") {
    return <Pill left="DSQ" variant="dsq" exporting={exporting} compact={compact} />
  }

  if (upper === "DNP") {
    return <Pill left="DNP" variant="dnp" exporting={exporting} compact={compact} />
  }

  return (
    <span
      style={{
        fontSize: exporting ? 18 : 15,
      }}
    >
      {t}
    </span>
  )
}

function renderTableStyleStatusBadge(value: string) {
  const t = (value || "").trim()
  const upper = t.toUpperCase()

  if (!t || t === "-") return null

  if (upper === "DNF") return <Pill left="DNF" variant="teal" />
  if (upper === "DNF-I") return <Pill left="DNF-I" variant="teal" />
  if (upper === "DNFV") return <Pill left="DNFV" variant="teal" />
  if (upper === "BOX") return <Pill left="BOX" variant="fuchsia" />
  if (upper === "DSQ") return <Pill left="DSQ" variant="dsq" />
  if (upper === "DNP") return <Pill left="DNP" variant="dnp" />
  if (/^\d+GIRO$/i.test(upper) || upper === "DOPPIATO") {
    return <Pill left="DOPPIATO" variant="orange" />
  }

  return null
}

function RaceResultStars({
  pp,
  gv,
  exporting = false,
}: {
  pp: boolean
  gv: boolean
  exporting?: boolean
}) {
  if (!pp && !gv) return null

  return (
    <span
  style={{
    position: "absolute",
    top: exporting ? -6 : -5,
    right:
      pp && gv
        ? (exporting ? -14 : -12)
        : (exporting ? -9 : -7),
    display: "flex",
    gap: 1,
    fontSize: exporting ? 10 : 9,
    lineHeight: 1,
  }}
>
      {pp && (
        <span
          style={{
            color: "#ffd700",
            textShadow: "0 0 6px rgba(255,215,0,0.45)",
          }}
        >
          ★
        </span>
      )}

      {gv && (
        <span
          style={{
            color: "#b67cff",
            textShadow: "0 0 6px rgba(160,90,255,0.45)",
          }}
        >
          ★
        </span>
      )}
    </span>
  )
}

function RaceResultPositionBadge({
  value,
  exporting = false,
}: {
  value: string
  exporting?: boolean
}) {
  const numeric = Number(value.replace("°", ""))
  const isP1 = numeric === 1
  const isP2 = numeric === 2
  const isP3 = numeric === 3
  const isPodium = isP1 || isP2 || isP3

  const podiumBg = isP1
    ? "linear-gradient(180deg, rgba(255,215,0,1), rgba(255,200,0,0.95))"
    : isP2
      ? "linear-gradient(180deg, rgba(220,220,220,0.96), rgba(185,185,185,0.96))"
      : "linear-gradient(180deg, rgba(205,127,50,0.96), rgba(168,102,38,0.96))"

  const podiumBorder = isP1
    ? "1px solid rgba(255,215,0,0.55)"
    : isP2
      ? "1px solid rgba(220,220,220,0.42)"
      : "1px solid rgba(205,127,50,0.45)"

  const podiumGlow = isP1
    ? "0 0 18px rgba(255,215,0,0.35)"
    : isP2
      ? "0 0 14px rgba(220,220,220,0.22)"
      : "0 0 14px rgba(205,127,50,0.22)"

  if (isPodium) {
    return (
      <span
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: exporting ? 30 : 26,
          height: exporting ? 20 : 18,
          padding: exporting ? "0 8px" : "0 7px",
          borderRadius: 999,
          background: podiumBg,
          border: podiumBorder,
          boxShadow: podiumGlow,
          color: "rgba(0,0,0,0.95)",
          fontWeight: 900,
          fontSize: exporting ? 12 : 11,
          lineHeight: 1,
          transform: "translateY(-1px)",
          whiteSpace: "nowrap",
        }}
      >
        <span>{value}</span>
      </span>
    )
  }

  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: exporting ? 34 : 30,
        height: exporting ? 20 : 18,
        padding: exporting ? "0 8px" : "0 7px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.22)",
        background: "transparent",
        boxShadow: "none",
        color: exporting ? "#ffffff" : "#ecfff5",
        fontWeight: 900,
        fontSize: exporting ? 16 : 14,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        letterSpacing: 0.1,
        textShadow: exporting
          ? "0 0 8px rgba(255,255,255,0.10)"
          : "0 0 8px rgba(64,224,208,0.12)",
        whiteSpace: "nowrap",
      }}
    >
      <span>{value}</span>
    </span>
  )
}

function RaceResultChip({
  position,
  status,
  pp,
  gv,
  exporting = false,
}: {
  position?: number | null
  status?: ChampionshipCellStatus | "DOPPIATO" | null
  pp?: boolean
  gv?: boolean
  exporting?: boolean
}) {
  const hasPp = !!pp
  const hasGv = !!gv

  if (status === "DNF" || status === "DNF-I" || status === "DNFV") {
  return <Pill left={status} variant="teal" exporting={exporting} />
}

  if (status === "BOX") {
  return <Pill left="BOX" variant="fuchsia" exporting={exporting} />
}

  if (status === "DSQ") {
  return <Pill left="DSQ" variant="dsq" exporting={exporting} />
}

  if (status === "DNP") {
  return <Pill left="DNP" variant="dnp" exporting={exporting} />
}

  if (status === "DOPPIATO") {
  return <Pill left="DOPPIATO" variant="orange" exporting={exporting} />
}

  if (position && position > 0) {
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <RaceResultPositionBadge value={`${position}°`} exporting={exporting} />
      <RaceResultStars pp={hasPp} gv={hasGv} exporting={exporting} />
    </span>
  )
}

  return (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: exporting ? 34 : 30,
      height: exporting ? 20 : 18,
      padding: exporting ? "0 8px" : "0 7px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.04)",
      color: "rgba(255,255,255,0.48)",
      fontWeight: exporting ? 800 : 700,
      fontSize: exporting ? 12 : 11,
      lineHeight: exporting ? "12px" : "11px",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
      whiteSpace: "nowrap",
      flexShrink: 0,
    }}
  >
    -
  </span>
)
}

function LegendBare() {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontSize: 12,
          opacity: 0.85,
          fontWeight: 900,
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
      >
        Legenda
      </span>

      <Pill left="POLE" variant="gold" />
      <Pill left="BEST LAP" variant="violet" />
      <Pill left="DOPPIATO" variant="orange" />
      <Pill left="DNP" variant="dnp" />
      <Pill left="DNF-I" variant="teal" />
      <Pill left="DNF-V" variant="teal" />
      <Pill left="BOX" variant="fuchsia" />
      <Pill left="DSQ" variant="dsq" />

      <span
  style={{
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    marginLeft: 8,
    fontSize: 16, // 👈 solo testo
    fontWeight: 800,
    opacity: 0.9,
  }}
>
  <span
    style={{
      fontSize: 34, // 👈 SOLO freccia
      color: "#22c55e",
      fontWeight: 900,
      textShadow: "0 0 8px rgba(34,197,94,0.45)",
      lineHeight: 1,
    }}
  >
    ▲
  </span>
  Promosso
</span>

      <span
  style={{
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 16, // 👈 SOLO testo
    fontWeight: 800,
    opacity: 0.9,
  }}
>
  <span
    style={{
      fontSize: 34, // 👈 QUI la grandezza freccia
      color: "#ef4444",
      fontWeight: 900,
      textShadow: "0 0 8px rgba(239,68,68,0.45)",
      lineHeight: 1,
    }}
  >
    ▼
  </span>
  Retrocesso
</span>
    </div>
  )
}

function AppHeader({
  mainTitle = "Albixximo Race Tools",
  sideLabel = "Race CSV Extractor",
  subtitle = "PRT Timing Assistant",
}: {
  mainTitle?: string
  sideLabel?: string
  subtitle?: string
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        marginBottom: 10,
        padding: 12,
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
        boxShadow: "0 14px 60px rgba(0,0,0,0.45)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(900px 220px at 10% 10%, rgba(255,215,0,0.18), transparent 60%)," +
            "radial-gradient(700px 220px at 90% 0%, rgba(160,90,255,0.18), transparent 55%)",
          opacity: 0.9,
        }}
      />

      <div style={{ position: "relative", minWidth: 0, flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "nowrap",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 34,
              fontWeight: 900,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              lineHeight: 1.05,
              textShadow: "0 0 18px rgba(255,215,0,0.22)",
              whiteSpace: "nowrap",
              flexShrink: 1,
              minWidth: 0,
            }}
          >
            {mainTitle}
          </div>

          <span
            style={{
              fontSize: 14,
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              opacity: 0.95,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {sideLabel}
          </span>
        </div>

        <div style={{ marginTop: 5, fontSize: 13, opacity: 0.9, whiteSpace: "nowrap" }}>
          {subtitle}
        </div>

        <div
          style={{
            marginTop: 8,
            height: 7,
            borderRadius: 999,
            background:
              "linear-gradient(90deg, rgba(255,215,0,0.0) 0%, rgba(255,215,0,0.35) 18%, rgba(255,255,255,0.14) 50%, rgba(160,90,255,0.30) 82%, rgba(160,90,255,0.0) 100%)",
            boxShadow: "0 0 18px rgba(255,215,0,0.14)",
            opacity: 0.9,
          }}
        />
      </div>

      <a
        href="/prt_logo.png"
        target="_blank"
        rel="noreferrer"
        title="PRT Logo"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textDecoration: "none",
          flexShrink: 0,
        }}
      >
        <img
          src="/prt_logo.png"
          alt="PRT"
          style={{
            height: 110,
            width: "auto",
            opacity: 0.98,
            filter:
              "drop-shadow(0 0 18px rgba(255,215,0,0.55)) drop-shadow(0 0 40px rgba(255,215,0,0.25))",
          }}
        />
      </a>
    </div>
  )
}

function SummaryStrip({
  winner,
  bestQuali,
  bestRaceLap,
  unionMeta,
  showMeta,
  showLobby,
  exporting = false,
}: {
  winner: string
  bestQuali: string
  bestRaceLap: string
  unionMeta: UnionMeta
  showMeta: boolean
  showLobby: boolean
  exporting?: boolean
}) {
  return (
    <div
      style={{
        padding: "16px 18px",
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.05)",
        boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center" }}>
          
          <HeaderBadge label="WINNER" value={winner} variant="silver" exporting={exporting} />

          <Separator exporting={exporting} />

          <HeaderBadge label="POLE (QUALIFICA)" value={bestQuali} variant="gold" exporting={exporting} />

          <Separator exporting={exporting} />

          <HeaderBadge label="BEST LAP (GARA)" value={bestRaceLap} variant="violet" exporting={exporting} />

          {showMeta && (
            <>
              <Separator exporting={exporting} />
              <HeaderBadge label="LEGA" value={unionMeta.lega} variant="gold" exporting={exporting} />
            </>
          )}

          {showMeta && (
            <>
              <Separator exporting={exporting} />
              <HeaderBadge label="GARA" value={unionMeta.gara} variant="violet" exporting={exporting} />
            </>
          )}

          {showLobby && (
            <>
              <Separator exporting={exporting} />
              <HeaderBadge label="LOBBY" value={unionMeta.lobby} variant="gold" exporting={exporting} />
            </>
          )}

        </div>
      </div>
    </div>
  )
}

function renderPrtPointsCell({
  row,
  bestRaceLap,
  exporting = false,
}: {
  row: DisplayRow
  bestRaceLap: string
  exporting?: boolean
}) {
  const rawTempo = tempoLikeGt7(row).trim().toUpperCase()

  const isBox = rawTempo === "BOX"
  const isDnf = rawTempo === "DNF" || rawTempo === "DNF-I"
  const isDnfv = rawTempo === "DNFV"
  const isDnp = rawTempo === "DNP"
  const isDsqRow = (row.tempoTotaleGara || "").trim().toUpperCase() === "DSQ"

  const isZeroPointsStatus = isBox || isDnfv || isDnp || isDsqRow

  const isPole = (row.pole || "").trim().toUpperCase() === "POLE"
  const bestLapTime = (bestRaceLap.split("  ").pop() || "").trim()
  const isBestLap = !!bestLapTime && (row.migliorGiroGara || "").trim() === bestLapTime

  const bonusPoints = (isPole ? 1 : 0) + (isBestLap ? 1 : 0)

  let pointsValue = 0

  if (isZeroPointsStatus) {
    pointsValue = 0
  } else if (isDnf) {
    const dnfBasePointsMap: Record<number, number> = {
  1: 30,
  2: 27,
  3: 24,
  4: 22,
  5: 20,
  6: 18,
  7: 16,
  8: 14,
  9: 12,
  10: 9,
  11: 7,
  12: 5,
  13: 3,
  14: 1,
}

pointsValue = (dnfBasePointsMap[row.posGara] ?? 0) + bonusPoints
  } else {
    pointsValue = getPointsForPrtRow(row, bestRaceLap)
  }

  const isP1 = row.posGara === 1
  const isP2 = row.posGara === 2
  const isP3 = row.posGara === 3
  const isPodium = isP1 || isP2 || isP3

  const podiumBg = isP1
    ? "linear-gradient(180deg, rgba(255,215,0,1), rgba(255,200,0,0.95))"
    : isP2
      ? "linear-gradient(180deg, rgba(220,220,220,0.96), rgba(185,185,185,0.96))"
      : "linear-gradient(180deg, rgba(205,127,50,0.96), rgba(168,102,38,0.96))"

  const podiumBorder = isP1
    ? "1px solid rgba(255,215,0,0.55)"
    : isP2
      ? "1px solid rgba(220,220,220,0.42)"
      : "1px solid rgba(205,127,50,0.45)"

  const podiumGlow = isP1
    ? "0 0 18px rgba(255,215,0,0.35)"
    : isP2
      ? "0 0 14px rgba(220,220,220,0.22)"
      : "0 0 14px rgba(205,127,50,0.22)"

  const normalPointsColor = exporting ? "#ffffff" : "#ecfff5"

  const title = isZeroPointsStatus
    ? "Punti gara: 0"
    : isDnf
      ? "Punti assegnati come DNF involontario"
      : isPole && isBestLap
        ? "Bonus: POLE + BEST LAP"
        : isPole
          ? "Bonus: POLE"
          : isBestLap
            ? "Bonus: BEST LAP"
            : "Punti gara"

  const stars = (isPole || isBestLap) ? (
    <span
      style={{
        position: "absolute",
        top: exporting ? -6 : -5,
        right:
          isPole && isBestLap
            ? (exporting ? -14 : -12)
            : (exporting ? -9 : -7),
        display: "flex",
        gap: 1,
        fontSize: exporting ? 10 : 9,
        lineHeight: 1,
      }}
    >
      {isPole && (
        <span
          style={{
            color: "#ffd700",
            textShadow: "0 0 6px rgba(255,215,0,0.45)",
          }}
        >
          ★
        </span>
      )}

      {isBestLap && (
        <span
          style={{
            color: "#b67cff",
            textShadow: "0 0 6px rgba(160,90,255,0.45)",
          }}
        >
          ★
        </span>
      )}
    </span>
  ) : null

  if (isPodium) {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",

        minWidth: exporting ? 44 : 26,
        height: exporting ? 30 : 18,
        padding: exporting ? "0 14px" : "0 7px",

        borderRadius: 999,
        background: podiumBg,
        border: podiumBorder,

        // ✨ GLOW PIÙ PULITO
        boxShadow: exporting
          ? `${podiumGlow}, 0 0 8px rgba(255,215,0,0.18)`
          : podiumGlow,

        // 🎯 COLORE TESTO PIÙ LEGGERO (ANTI-BOLD OTTICO)
        color: exporting
          ? "rgba(20,20,20,0.75)"
          : "rgba(0,0,0,0.95)",

        // ⚖️ PESO BILANCIATO
        fontWeight: exporting ? 700 : 900,

        fontSize: exporting ? 17 : 11,
        lineHeight: 1,
        transform: "translateY(-1px)",

        // ✨ SHADOW SUPER LEGGERA
        textShadow: exporting
          ? "0 0.5px 0.8px rgba(0,0,0,0.25)"
          : "none",
      }}
      title={title}
    >
      <span>{pointsValue}</span>
      {stars}
    </span>
  )
}

  return (
    <span
      title={title}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: exporting ? 34 : 30,
        height: exporting ? 20 : 18,
        padding: exporting ? "0 8px" : "0 7px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.22)",
        background: "transparent",
        boxShadow: "none",
        color: normalPointsColor,
        fontWeight: 900,
        fontSize: exporting ? 17 : 15,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        letterSpacing: 0.1,
        textShadow: exporting
          ? "0 0 8px rgba(255,255,255,0.10)"
          : "0 0 8px rgba(64,224,208,0.12)",
      }}
    >
      <span>{pointsValue}</span>
      {stars}
    </span>
  )
}

function renderPrtDriverCell({
  row,
  exporting = false,
}: {
  row: DisplayRow
  exporting?: boolean
}) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: exporting ? 18 : undefined,
        fontWeight: exporting ? (row.posGara === 1 ? 800 : 700) : undefined,
        letterSpacing: exporting ? "0.04em" : undefined,
        color: exporting ? (row.posGara === 1 ? "#fff6cc" : "#ffffff") : undefined,
        textShadow: exporting
          ? (row.posGara === 1 ? "0 0 10px rgba(255,215,0,0.45)" : "none")
          : undefined,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: "100%",
      }}
    >
      {row.pilota}
    </span>
  )
}

function renderPrtCarCell({
  row,
  exporting = false,
}: {
  row: DisplayRow
  exporting?: boolean
}) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: exporting ? 17 : 15,
        color: "rgba(255,255,255,0.72)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: "100%",
      }}
    >
      {row.auto || "-"}
    </span>
  )
}

function NoTimePill({ exporting = false }: { exporting?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: exporting ? "7px 13px" : "6px 12px",
        borderRadius: 999,
        border: "1px solid rgba(59,130,246,0.7)",
        background: "transparent",
        color: "rgba(147,197,253,0.95)",
        fontWeight: 800,
        fontSize: exporting ? 13 : 12,
        letterSpacing: 0.5,
        whiteSpace: "nowrap",
      }}
    >
      NO TIME
    </span>
  )
}

function renderPrtQualifyingCell({
  row,
  exporting = false,
}: {
  row: DisplayRow
  exporting?: boolean
}) {
  const quali = String(row.tempoQualifica || "").trim()
  const isPole = (row.pole || "").trim().toUpperCase() === "POLE"

  const distacco = String(row.distaccoDalPrimo || "").toUpperCase()
  const tempo = String(row.tempoTotaleGara || "").toUpperCase()

  const isDnp =
  distacco === "DNP" ||
  tempo === "DNP" ||
  tempo === "DNS" ||
  distacco === "DSQ" ||
  tempo === "DSQ"

  // 👉 DNP: cella vuota
  if (isDnp) {
    return <span />
  }

  // 👉 POLE
  if (isPole) {
    return (
      <Pill
        left="POLE"
        right={quali && quali !== "-" ? quali : "NO TIME"}
        variant="gold"
        exporting={exporting}
      />
    )
  }

  // 👉 NO TIME
  if (!quali || quali === "-") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: exporting ? "7px 13px" : "6px 12px",
          borderRadius: 999,
          border: "1px solid rgba(59,130,246,0.7)",
          background: "transparent",
          color: "rgba(147,197,253,0.95)",
          fontWeight: 800,
          fontSize: exporting ? 13 : 12,
          letterSpacing: 0.5,
          whiteSpace: "nowrap",
        }}
      >
        NO TIME
      </span>
    )
  }

  // 👉 tempo normale
  return (
    <span
      style={{
        fontSize: exporting ? 18 : 15,
      }}
    >
      {quali}
    </span>
  )
}

function renderPrtBestLapCell({
  row,
  bestRaceLap,
  exporting = false,
}: {
  row: DisplayRow
  bestRaceLap: string
  exporting?: boolean
}) {
  if ((bestRaceLap || "").trim().toUpperCase() === "NO TIME") {
  const tempo = tempoLikeGt7(row).trim().toUpperCase()

  if (tempo === "DNP") {
    return "-"
  }

  return <Pill left="NO TIME" variant="orange" exporting={exporting} />
}
  const bestLapTime = (bestRaceLap.split("  ").pop() || "").trim()
  const isBestLap =
    !!bestLapTime && (row.migliorGiroGara || "").trim() === bestLapTime

  if (isBestLap && row.migliorGiroGara) {
    return (
      <Pill
        left="BEST LAP"
        right={row.migliorGiroGara}
        variant="violet"
        exporting={exporting}
      />
    )
  }

  return (
    <span
      style={{
        fontSize: exporting ? 18 : 15,
      }}
    >
      {row.migliorGiroGara || "-"}
    </span>
  )
}

function renderPrtMetaCell({
  type,
  value,
  exporting = false,
}: {
  type: "gara" | "lega" | "lobby"
  value: string
  exporting?: boolean
}) {
  const cleanValue = String(value || "").trim()

  if (type === "gara" && cleanValue === "-") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: exporting ? 34 : 28,
          height: exporting ? 28 : 24,
          padding: exporting ? "0 10px" : "0 8px",
          borderRadius: 999,
          background: "rgba(255,165,0,0.16)",
          border: "1px solid rgba(255,165,0,0.32)",
          boxShadow: "0 0 10px rgba(255,165,0,0.12)",
          color: "#fff3e0",
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        -
      </span>
    )
  }

  return cleanValue || "-"
}

function renderPrtPenaltyCell({
  row,
  penalties,
  raceNumber,
  exporting = false,
  unionMode,
  exportHasMultiPenalty,
  exportPenaltyTimeTextStyle,
}: {
  row: DisplayRow
  penalties: PenaltyMap
  raceNumber: number
  exporting?: boolean
  unionMode: boolean
  exportHasMultiPenalty: boolean
  exportPenaltyTimeTextStyle: React.CSSProperties
}) {
  const key = getPrtRowStableKey(row.sourcePosGara)
  const penaltyEntries = penalties[key] || []
  const penaltyMain = getPenaltyMainDisplay(penaltyEntries, raceNumber)
  const isDsqRow = (row.tempoTotaleGara || "").trim().toUpperCase() === "DSQ"
const isRecoveredDsqRow = row.sourcePosGara >= 9000
const showPenaltyDetail = !(exporting && unionMode)

if (isDsqRow || isRecoveredDsqRow || penaltyMain.kind === "dsq") {
  return <Pill left="DSQ" variant="dsq" />
}

  if (penaltyEntries.length === 0) {
    return "-"
  }

  if (!showPenaltyDetail) {
    if (penaltyMain.kind === "ammonition") {
      return (
        <div
          style={{
            ...exportPenaltyTimeTextStyle,
            color: "#f59e0b",
          }}
        >
          00:00.000
        </div>
      )
    }

    if (penaltyMain.kind === "time") {
      return (
        <div style={exportPenaltyTimeTextStyle}>
          {penaltyMain.text}
        </div>
      )
    }

    return "-"
  }

  if (penaltyEntries.length === 1) {
    const entry = penaltyEntries[0]
    const rule = getPenaltyRule(entry.code, raceNumber)

    if (exportHasMultiPenalty) {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: exporting ? 18 : 16,
            minHeight: exporting ? 34 : 28,
            width: "100%",
          }}
        >
          <div
            style={{
              whiteSpace: "nowrap",
              minWidth: exporting ? 108 : 92,
              textAlign: "right",
              flexShrink: 0,
            }}
          >
            {(() => {
              if (rule.effect === "ammonition") {
                return (
                  <div
                    style={{
                      ...exportPenaltyTimeTextStyle,
                      color: "#f59e0b",
                    }}
                  >
                    00:00.000
                  </div>
                )
              }

              if (rule.effect === "dsq") {
                return <Pill left="DSQ" variant="dsq" />
              }

              if (rule.effect === "time") {
                return <div style={exportPenaltyTimeTextStyle}>{penaltyMain.text}</div>
              }

              return "-"
            })()}
          </div>

          <div
            style={{
              borderLeft: "1px solid rgba(255,255,255,0.18)",
              paddingLeft: exporting ? 14 : 12,
              minWidth: 0,
              width: "100%",
              display: "grid",
              gridTemplateColumns: exporting ? "repeat(2, minmax(0, 1fr))" : "1fr",
              gap: exporting ? "6px 12px" : 4,
              alignItems: "start",
            }}
          >
            <div
              style={{
                fontSize: exporting ? 14 : 12,
                lineHeight: exporting ? 1.18 : 1.15,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                letterSpacing: exporting ? 0.1 : undefined,
                display: "flex",
                alignItems: "center",
                gap: exporting ? 8 : 6,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: exporting ? "4px 9px" : "2px 6px",
                  borderRadius: 6,
                  fontWeight: 900,
                  fontSize: exporting ? 15 : 12,
                  letterSpacing: 0.2,
                  color: "white",
                  background:
                    rule.effect === "ammonition"
                      ? "#f59e0b"
                      : rule.effect === "dsq"
                        ? "#ff4dff"
                        : "#ff2d2d",
                  boxShadow:
                    rule.effect === "ammonition"
                      ? "0 0 10px rgba(245,158,11,0.35)"
                      : rule.effect === "dsq"
                        ? "0 0 10px rgba(255,77,255,0.35)"
                        : "0 0 10px rgba(255,45,45,0.35)",
                  flexShrink: 0,
                }}
              >
                {entry.code}
              </span>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 2,
                  minWidth: 0,
                }}
              >
                <span>Lap</span>
                <span
                  style={{
                    display: "inline-block",
                    minWidth: exporting ? 16 : 12,
                    textAlign: "right",
                  }}
                >
                  {entry.lap === "Lap -" ? "-" : entry.lap.replace("Lap ", "").replace("Lap", "")}
                </span>
              </span>

              <span
                style={{
                  display: "inline-block",
                  minWidth: exporting ? 40 : 34,
                  textAlign: "right",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  flexShrink: 0,
                }}
              >
                {entry.lap === "Lap -" ? "--:--" : `${entry.minute}:${entry.second}`}
              </span>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: exporting ? 18 : 14,
          minHeight: exporting ? 34 : 28,
          width: "100%",
        }}
      >
        <div
          style={{
            whiteSpace: "nowrap",
            minWidth: exporting ? 108 : 92,
            textAlign: "right",
            flexShrink: 0,
          }}
        >
          {(() => {
            if (rule.effect === "ammonition") {
              return (
                <div
                  style={{
                    ...exportPenaltyTimeTextStyle,
                    color: "#f59e0b",
                  }}
                >
                  00:00.000
                </div>
              )
            }

            if (rule.effect === "dsq") {
              return <Pill left="DSQ" variant="dsq" />
            }

            if (rule.effect === "time") {
              return <div style={exportPenaltyTimeTextStyle}>{penaltyMain.text}</div>
            }

            return "-"
          })()}
        </div>

        <div
          style={{
            borderLeft: "1px solid rgba(255,255,255,0.18)",
            paddingLeft: exporting ? 14 : 12,
            display: "grid",
            gap: exporting ? 5 : 4,
            justifyItems: "start",
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: exporting ? 15 : 12,
              lineHeight: exporting ? 1.05 : 1.15,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              letterSpacing: exporting ? 0.05 : undefined,
              display: "flex",
              alignItems: "center",
              gap: exporting ? 10 : 6,
              minWidth: 0,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: exporting ? "5px 11px" : "2px 6px",
                borderRadius: 7,
                fontWeight: 900,
                fontSize: exporting ? 16 : 12,
                letterSpacing: 0.15,
                color: "white",
                background:
                  rule.effect === "ammonition"
                    ? "#f59e0b"
                    : rule.effect === "dsq"
                      ? "#ff4dff"
                      : "#ff2d2d",
                boxShadow:
                  rule.effect === "ammonition"
                    ? "0 0 10px rgba(245,158,11,0.35)"
                    : rule.effect === "dsq"
                      ? "0 0 10px rgba(255,77,255,0.35)"
                      : "0 0 10px rgba(255,45,45,0.35)",
                flexShrink: 0,
              }}
            >
              {entry.code}
            </span>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>Lap</span>
              <span
                style={{
                  display: "inline-block",
                  minWidth: exporting ? 22 : 12,
                  textAlign: "right",
                }}
              >
                {entry.lap === "Lap -" ? "-" : entry.lap.replace("Lap ", "").replace("Lap", "")}
              </span>
            </span>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                minWidth: exporting ? 54 : 34,
                justifyContent: "flex-end",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: exporting ? 15 : 12,
                lineHeight: 1.1,
              }}
            >
              {entry.lap === "Lap -" ? "--:--" : `${entry.minute}:${entry.second}`}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: exporting ? 18 : 16,
        minHeight: exporting ? 34 : 28,
        width: "100%",
      }}
    >
      <div
        style={{
          whiteSpace: "nowrap",
          minWidth: exporting ? 108 : 92,
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {(() => {
          if (penaltyMain.kind === "ammonition") {
            return (
              <div
                style={{
                  ...exportPenaltyTimeTextStyle,
                  color: "#f59e0b",
                }}
              >
                00:00.000
              </div>
            )
          }

          if (hasDsqPenalty(penaltyEntries, raceNumber)) {
            return <Pill left="DSQ" variant="dsq" />
          }

          if (penaltyMain.kind === "time") {
            return <div style={exportPenaltyTimeTextStyle}>{penaltyMain.text}</div>
          }

          return "-"
        })()}
      </div>

      <div
        style={{
          borderLeft: "1px solid rgba(255,255,255,0.18)",
          paddingLeft: exporting ? 14 : 12,
          minWidth: 0,
          width: "100%",
          display: "grid",
          gridTemplateColumns: exporting ? "repeat(2, minmax(0, 1fr))" : "1fr",
          gap: exporting ? "6px 12px" : 4,
          alignItems: "start",
        }}
      >
        {penaltyEntries.slice(0, 4).map((entry) => {
          const rule = getPenaltyRule(entry.code, raceNumber)

          return (
            <div
              key={entry.id}
              style={{
                fontSize: exporting ? 13 : 12,
                lineHeight: exporting ? 1.18 : 1.15,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                letterSpacing: exporting ? 0.1 : undefined,
                display: "flex",
                alignItems: "center",
                gap: exporting ? 6 : 6,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: exporting ? "2px 6px" : "2px 6px",
                  borderRadius: 6,
                  fontWeight: 900,
                  fontSize: exporting ? 13 : 12,
                  letterSpacing: 0.2,
                  color: "white",
                  background:
                    rule.effect === "ammonition"
                      ? "#f59e0b"
                      : rule.effect === "dsq"
                        ? "#ff4dff"
                        : "#ff2d2d",
                  boxShadow:
                    rule.effect === "ammonition"
                      ? "0 0 10px rgba(245,158,11,0.35)"
                      : rule.effect === "dsq"
                        ? "0 0 10px rgba(255,77,255,0.35)"
                        : "0 0 10px rgba(255,45,45,0.35)",
                  flexShrink: 0,
                }}
              >
                {entry.code}
              </span>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 2,
                  minWidth: 0,
                }}
              >
                <span>Lap</span>
                <span
                  style={{
                    display: "inline-block",
                    minWidth: exporting ? 16 : 12,
                    textAlign: "right",
                  }}
                >
                  {entry.lap === "Lap -" ? "-" : entry.lap.replace("Lap ", "").replace("Lap", "")}
                </span>
              </span>

              <span
                style={{
                  display: "inline-block",
                  minWidth: exporting ? 40 : 34,
                  textAlign: "right",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  flexShrink: 0,
                }}
              >
                {entry.lap === "Lap -" ? "--:--" : `${entry.minute}:${entry.second}`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const PRT_TABLE_STYLES = {
  wrapper: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.22)",
    overflow: "hidden",
  },
  wrapperExport: {
    borderRadius: 20,
    boxShadow: "0 12px 40px rgba(0,0,0,0.28)",
  },
  headBar: {
    padding: "12px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap" as const,
    alignItems: "center",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
  },
  headBarExport: {
    padding: "10px 14px",
  },
  title: {
    fontWeight: 900,
    fontSize: 16,
    letterSpacing: 0.3,
  },
  titleExport: {
    fontSize: 18,
  },
  counter: {
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    opacity: 0.9,
    whiteSpace: "nowrap" as const,
  },
  counterExport: {
    padding: "7px 12px",
    fontSize: 12,
  },
  table: {
    width: "100%",
    minWidth: 1500,
    borderCollapse: "collapse" as const,
    tableLayout: "fixed" as const,
  },
  tableExport: {
    minWidth: 1540,
  },
  thead: {
    background: "rgba(10,12,18,0.96)",
  },
  theadLive: {
    position: "sticky" as const,
    top: 0,
    zIndex: 2,
    backdropFilter: "blur(10px)",
  },
  thBase: {
    opacity: 0.82,
    whiteSpace: "nowrap" as const,
    fontWeight: 800,
    letterSpacing: 0.2,
  },
  columns: {
    pos: { width: 58, minWidth: 58 },
    pilota: { width: 220, minWidth: 220 },
    auto: { width: 220, minWidth: 220 },
    quali: { width: 185, minWidth: 185 },
    tempi: { width: 170, minWidth: 170 },
    penaltyLive: { width: 320, minWidth: 320 },
    penaltyExport: { width: 430, minWidth: 430 },
    bestLap: { width: 240, minWidth: 240 },
    punti: { width: 95, minWidth: 95 },
    puntiExport: { width: 110, minWidth: 110 },
    gara: { width: 84, minWidth: 84 },
    lega: { width: 110, minWidth: 110 },
    lobby: { width: 95, minWidth: 95 },
  },
  thPadding: {
    small: "10px 8px",
    normal: "12px 12px",
    center: "10px 10px",
    pos: "10px 6px",
  },
  thPaddingExport: {
    small: "10px 8px",
    normal: "10px 12px",
    center: "10px 10px",
    pos: "10px 8px",
  },
  thFont: {
    small: 11,
    normal: 12,
  },
  thFontExport: {
    small: 13,
    normal: 14,
  },
} as const

const PRT_ROW_STYLES = {
  fallbackEven: "rgba(255,255,255,0.02)",
  fallbackOdd: "rgba(0,0,0,0.10)",
  dsq: {
    background:
      "linear-gradient(90deg, rgba(212,0,255,0.20) 0%, rgba(212,0,255,0.10) 30%, rgba(255,255,255,0.02) 78%)",
    boxShadow: "inset 3px 0 0 rgba(212,0,255,0.85)",
  },
  posCellLive: {
    padding: "7px 4px",
  },
  posCellExport: {
    padding: "8px 6px",
  },
  driverLive: {
    fontSize: 14,
    fontWeight: 700,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis" as const,
  },
  driverExportLeader: {
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: "0.03em",
    color: "#fff6cc",
    textShadow: "0 0 10px rgba(255,215,0,0.45)",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis" as const,
  },
  driverExportNormal: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: "0.03em",
    color: "#ffffff",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis" as const,
  },
  carLive: {
    maxWidth: 150,
  },
  carExport: {
  maxWidth: 220,
},
  qualiLive: {
    whiteSpace: "nowrap" as const,
  },
  qualiExport: {
    whiteSpace: "nowrap" as const,
    fontSize: 17,
  },
  tempoLive: {
    whiteSpace: "nowrap" as const,
    fontSize: 13,
  },
  tempoExport: {
    whiteSpace: "nowrap" as const,
    fontSize: 16,
  },
  penaltyLive: {
    fontSize: 12,
    padding: "7px 6px",
  },
  penaltyExport: {
    fontSize: 16,
    padding: "8px 8px",
  },
  bestLapLive: {
    whiteSpace: "nowrap" as const,
  },
  bestLapExport: {
    whiteSpace: "nowrap" as const,
    fontSize: 17,
  },
  pointsLive: {
    whiteSpace: "nowrap" as const,
    fontSize: 13,
    fontWeight: 900,
  },
  pointsExport: {
    whiteSpace: "nowrap" as const,
    fontSize: 16,
    fontWeight: 900,
  },
} as const

function getPrtTableRowStyle(pos: number, index: number, isDsqRow: boolean): React.CSSProperties {
  if (isDsqRow) return PRT_ROW_STYLES.dsq

  const fallbackBg =
    index % 2 === 0 ? PRT_ROW_STYLES.fallbackEven : PRT_ROW_STYLES.fallbackOdd

  return rowStyleForPos(pos, fallbackBg)
}

function ResultsTable({
  previewRows,
  bestRaceLap,
  unionMeta,
  prtMode,
  unionMode,
  exporting = false,
  penalties,
  raceNumber,
  forceHideMeta = false,
  tableTitle = "Classifica (output)",
}: {
  previewRows: DisplayRow[]
  bestRaceLap: string
  unionMeta: UnionMeta
  prtMode: boolean
  unionMode: boolean
  exporting?: boolean
  penalties: PenaltyMap
  raceNumber: number
  forceHideMeta?: boolean
  tableTitle?: string
}) {
  const showMeta = !forceHideMeta && (prtMode || unionMode)
  const showLobby = !forceHideMeta && unionMode

  const exportHasMultiPenalty = exporting && previewRows.some((row) => {
    const key = getPrtRowStableKey(row.sourcePosGara)
    return (penalties[key] || []).length > 1
  })

  const exportPenaltyTimeTextStyle: React.CSSProperties = {
    color: "#ff2d2d",
    fontWeight: 900,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: exporting ? 17 : 14,
    lineHeight: 1,
    whiteSpace: "nowrap",
    textAlign: "right",
  }

  const styles = PRT_TABLE_STYLES
  const currentTableMinWidth = exporting
    ? styles.tableExport.minWidth
    : styles.table.minWidth

  const currentPenaltyColumn = exporting
    ? styles.columns.penaltyExport
    : styles.columns.penaltyLive

  const currentPointsColumn = exporting
    ? styles.columns.puntiExport
    : styles.columns.punti

  const thPad = exporting ? styles.thPaddingExport : styles.thPadding
  const thFont = exporting ? styles.thFontExport : styles.thFont
  const exportStatusPillCount = previewRows.filter((row) => {
  const value = tempoLikeGt7(row).trim().toUpperCase()

  return (
    value === "DNF" ||
    value === "DNF-I" ||
    value === "DNFV" ||
    value === "BOX" ||
    value === "DSQ" ||
    value === "DNP" ||
    value === "DOPPIATO" ||
    /^\d+GIRO$/i.test(value)
  )
}).length

const compactStatusPills = exporting && exportStatusPillCount > 2

  return (
    <div
      style={{
        ...styles.wrapper,
        ...(exporting ? styles.wrapperExport : {}),
      }}
    >
      <div
        style={{
          ...styles.headBar,
          ...(exporting ? styles.headBarExport : {}),
        }}
      >
        <div
          style={{
            ...styles.title,
            ...(exporting ? styles.titleExport : {}),
          }}
        >
          {tableTitle}
        </div>

        <div
          style={{
            ...styles.counter,
            ...(exporting ? styles.counterExport : {}),
          }}
        >
          {exporting ? `Partecipanti: ${previewRows.length}` : `${previewRows.length} partecipanti`}
        </div>
      </div>

      <div style={{ overflowX: "auto", overflowY: "hidden" }}>
        <table
          style={{
            ...styles.table,
            minWidth: currentTableMinWidth,
          }}
        >
          <thead
            style={{
              ...styles.thead,
              ...(exporting ? {} : styles.theadLive),
            }}
          >
            <tr>
              <th
                style={{
                  ...styles.thBase,
                  padding: thPad.pos,
                  textAlign: "center",
                  fontSize: thFont.small,
                  ...styles.columns.pos,
                }}
              >
                Pos
              </th>

              <th
                style={{
                  ...styles.thBase,
                  padding: thPad.normal,
                  textAlign: "left",
                  fontSize: thFont.normal,
                  ...styles.columns.pilota,
                }}
              >
                Pilota
              </th>

              <th
                style={{
                  ...styles.thBase,
                  padding: thPad.normal,
                  textAlign: "left",
                  fontSize: thFont.normal,
                  ...styles.columns.auto,
                }}
              >
                Auto
              </th>

              <th
                style={{
                  ...styles.thBase,
                  padding: thPad.normal,
                  textAlign: "right",
                  fontSize: thFont.normal,
                  ...styles.columns.quali,
                }}
              >
                Qualifica
              </th>

              <th
                style={{
                  ...styles.thBase,
                  padding: thPad.normal,
                  textAlign: "right",
                  fontSize: thFont.normal,
                  ...styles.columns.tempi,
                }}
              >
                Tempi gara
              </th>

              <th
                style={{
                  ...styles.thBase,
                  padding: thPad.center,
                  textAlign: "center",
                  fontSize: thFont.small,
                  ...currentPenaltyColumn,
                }}
              >
                Penalità
              </th>

              <th
                style={{
                  ...styles.thBase,
                  padding: thPad.normal,
                  textAlign: "right",
                  fontSize: thFont.normal,
                  ...styles.columns.bestLap,
                }}
              >
                Miglior giro
              </th>

              <th
                style={{
                  ...styles.thBase,
                  padding: thPad.normal,
                  textAlign: "center",
                  fontSize: thFont.normal,
                  ...currentPointsColumn,
                }}
              >
                Punti
              </th>

              {showMeta && (
                <th
                  style={{
                    ...styles.thBase,
                    padding: thPad.normal,
                    textAlign: "center",
                    fontSize: 12,
                    ...styles.columns.gara,
                  }}
                >
                  Gara
                </th>
              )}

              {showMeta && (
                <th
                  style={{
                    ...styles.thBase,
                    padding: thPad.normal,
                    textAlign: "center",
                    fontSize: 12,
                    ...styles.columns.lega,
                  }}
                >
                  Lega
                </th>
              )}

              {showLobby && (
                <th
                  style={{
                    ...styles.thBase,
                    padding: thPad.normal,
                    textAlign: "center",
                    fontSize: 12,
                    ...styles.columns.lobby,
                  }}
                >
                  Lobby
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {previewRows.map((r, i) => {
              const tempo = tempoLikeGt7(r)
              const isDsqRow = (r.tempoTotaleGara || "").trim().toUpperCase() === "DSQ"
const isRecoveredDsqRow = isDsqRow && r.sourcePosGara >= 9000

const rowStyle = getPrtTableRowStyle(
  r.posGara,
  i,
  isDsqRow && !isRecoveredDsqRow
)

              return (
                <tr
                  key={`${r.sourcePosGara}-${r.pilota}-${i}`}
                  style={rowStyle}
                >
                  <TableCell
                    exporting={exporting}
                    align="center"
                    style={{
                      ...styles.columns.pos,
                      ...(exporting
                        ? PRT_ROW_STYLES.posCellExport
                        : PRT_ROW_STYLES.posCellLive),
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <PosBadge pos={r.posGara} />
                    </div>
                  </TableCell>

                  <TableCell
                    exporting={exporting}
                    style={
                      exporting
                        ? r.posGara === 1
                          ? PRT_ROW_STYLES.driverExportLeader
                          : PRT_ROW_STYLES.driverExportNormal
                        : PRT_ROW_STYLES.driverLive
                    }
                  >
                    {renderPrtDriverCell({
                      row: r,
                      exporting,
                    })}
                  </TableCell>

                  <TableCell
                    exporting={exporting}
                    dim
                    style={exporting ? PRT_ROW_STYLES.carExport : PRT_ROW_STYLES.carLive}
                  >
                    {renderPrtCarCell({
                      row: r,
                      exporting,
                    })}
                  </TableCell>

                  <TableCell
                    exporting={exporting}
                    align="right"
                    mono
                    dim={!r.tempoQualifica && (r.pole || "").trim().toUpperCase() !== "POLE"}
                    style={exporting ? PRT_ROW_STYLES.qualiExport : PRT_ROW_STYLES.qualiLive}
                  >
                    {renderPrtQualifyingCell({
                      row: r,
                      exporting,
                    })}
                  </TableCell>

                  <TableCell
                    exporting={exporting}
                    align="right"
                    mono
                    style={exporting ? PRT_ROW_STYLES.tempoExport : PRT_ROW_STYLES.tempoLive}
                  >
                    {renderTempoCell(tempo, exporting, compactStatusPills)}
                  </TableCell>

                  <TableCell
                    exporting={exporting}
                    align="center"
                    mono
                    dim={(() => {
                      const key = getPrtRowStableKey(r.sourcePosGara)
                      const penaltyEntries = penalties[key] || []
                      return penaltyEntries.length === 0 && !isDsqRow
                    })()}
                    style={{
                      ...(exporting
                        ? PRT_ROW_STYLES.penaltyExport
                        : PRT_ROW_STYLES.penaltyLive),
                      width: currentPenaltyColumn.width,
                      minWidth: currentPenaltyColumn.minWidth,
                    }}
                  >
                    {renderPrtPenaltyCell({
  row: r,
  penalties,
  raceNumber,
  exporting,
  unionMode,
  exportHasMultiPenalty,
  exportPenaltyTimeTextStyle,
})}
                  </TableCell>

                  <TableCell
                    exporting={exporting}
                    align="right"
                    mono
                    dim={!r.migliorGiroGara}
                    style={exporting ? PRT_ROW_STYLES.bestLapExport : PRT_ROW_STYLES.bestLapLive}
                  >
                    {renderPrtBestLapCell({
                      row: r,
                      bestRaceLap,
                      exporting,
                    })}
                  </TableCell>

                  <TableCell
                    exporting={exporting}
                    align="center"
                    mono
                    style={exporting ? PRT_ROW_STYLES.pointsExport : PRT_ROW_STYLES.pointsLive}
                  >
                    {renderPrtPointsCell({
                      row: r,
                      bestRaceLap,
                      exporting,
                    })}
                  </TableCell>

                  {showMeta && (
                    <TableCell exporting={exporting} align="center" mono dim={!unionMeta.gara}>
                      {renderPrtMetaCell({
                        type: "gara",
                        value: unionMeta.gara,
                        exporting,
                      })}
                    </TableCell>
                  )}

                  {showMeta && (
                    <TableCell exporting={exporting} align="center" mono dim={!unionMeta.lega}>
                      {renderPrtMetaCell({
                        type: "lega",
                        value: unionMeta.lega,
                        exporting,
                      })}
                    </TableCell>
                  )}

                  {showLobby && (
                    <TableCell exporting={exporting} align="center" mono dim={!unionMeta.lobby}>
                      {renderPrtMetaCell({
                        type: "lobby",
                        value: unionMeta.lobby,
                        exporting,
                      })}
                    </TableCell>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const CHAMPIONSHIP_LEAGUES: ChampionshipLeagueKey[] = [
  "ELITE",
  "PLATINUM",
  "MASTER",
  "PRO",
  "GT",
]

const RACE_OPTIONS = Array.from({ length: 13 }, (_, i) => ({
  value: i + 1,
  label: i === 12 ? `Gara ${i + 1} - Finale` : `Gara ${i + 1}`,
}))
const PRT_CHAMPIONSHIP_STORAGE_KEY = "albixximo_prt_championship_state"
const PRT_CURRENT_RACE_STORAGE_KEY = "albixximo_prt_current_race"
const PRT_SELECTED_LEAGUE_STORAGE_KEY = "albixximo_prt_selected_league"
const PRT_DRIVER_BASELINES_STORAGE_KEY = "albixximo_prt_driver_baselines"
const PRT_MANUAL_RACE12_STORAGE_KEY = "albixximo_prt_manual_race12"
const PRT_DRIVER_LEAGUE_MAP_STORAGE_KEY = "albixximo_prt_driver_league_map"
const PRT_DRIVER_ALIAS_MAP_STORAGE_KEY = "albixximo_prt_driver_alias_map"
const PRT_DRIVER_RATING_MAP_STORAGE_KEY = "albixximo_prt_driver_rating_map"

export default function Page() {
  const [files, setFiles] = useState<File[]>([])
  const [csv, setCsv] = useState("")
  const [rows, setRows] = useState<ExtractRow[]>([])
  const [qualiRows, setQualiRows] = useState<QualiRow[]>([])
  const [unionMeta, setUnionMeta] = useState<UnionMeta>({ gara: "", lobby: "", lega: "" })
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState("")
  const [showTable, setShowTable] = useState(true)
  const [showReq, setShowReq] = useState(false)
  const [prtMode, setPrtMode] = useState(true)
  const [unionMode, setUnionMode] = useState(false)
  const [penalties, setPenalties] = useState<PenaltyMap>({})
  const [exportMetaInPng, setExportMetaInPng] = useState(false)
  const [lapOverrides, setLapOverrides] = useState<Record<string, string>>({})
  const [dnfOverrides, setDnfOverrides] = useState<DnfOverrideMap>({})
  const [showExportModal, setShowExportModal] = useState(false)
  const [manualGaraOverride, setManualGaraOverride] = useState("")
  const [manualLegaOverride, setManualLegaOverride] = useState("")



  const [manualPilotOverrides, setManualPilotOverrides] = useState<Record<number, string>>({})
  const [manualAutoOverrides, setManualAutoOverrides] = useState<Record<number, string>>({})
  const [manualDistaccoOverrides, setManualDistaccoOverrides] = useState<Record<number, string>>({})
  const [currentRace, setCurrentRace] = useState<number>(3)


const [selectedLeague, setSelectedLeague] = useState<ChampionshipLeagueKey>("ELITE")

const [championshipState, setChampionshipState] = useState<ChampionshipState>({
  races: {},
  roundMovements: {},
})
const [drawerOpen, setDrawerOpen] = useState(false)
const [driverBaselines, setDriverBaselines] = useState<DriverBaselineEntry[]>([])
const [manualRace12Draft, setManualRace12Draft] = useState<
  Record<string, { g1: string; g2: string }>
>({})
const [drawerBulkDrafts, setDrawerBulkDrafts] = useState<Record<ChampionshipLeagueKey, string>>({
  ELITE: "",
  PLATINUM: "",
  MASTER: "",
  PRO: "",
  GT: "",
})
const [drawerDrafts, setDrawerDrafts] = useState<Record<ChampionshipLeagueKey, string>>({
  ELITE: "",
  PLATINUM: "",
  MASTER: "",
  PRO: "",
  GT: "",
})
const [driverLeagueMap, setDriverLeagueMap] = useState<DriverLeagueMap>({
  ELITE: [],
  PLATINUM: [],
  MASTER: [],
  PRO: [],
  GT: [],
})

const [workbenchDriverLeagueMap, setWorkbenchDriverLeagueMap] = useState<DriverLeagueMap>({
  ELITE: [],
  PLATINUM: [],
  MASTER: [],
  PRO: [],
  GT: [],
})

function cloneDriverLeagueMap(source: DriverLeagueMap): DriverLeagueMap {
  return {
    ELITE: [...(source.ELITE || [])],
    PLATINUM: [...(source.PLATINUM || [])],
    MASTER: [...(source.MASTER || [])],
    PRO: [...(source.PRO || [])],
    GT: [...(source.GT || [])],
  }
}

const [driverAliasMap, setDriverAliasMap] = useState<DriverAliasMap>({
  ELITE: {},
  PLATINUM: {
    focuss: "JM_focuss_71",
  },
  MASTER: {},
  PRO: {},
  GT: {},
})

const [driverRatingMap, setDriverRatingMap] = useState<Record<string, DriverRatingValue>>({})

const [unknownDriverSelections, setUnknownDriverSelections] = useState<Record<string, string>>({})
const [dismissedUnknownDrivers, setDismissedUnknownDrivers] = useState<Record<string, true>>({})
const [pendingQualiAliasName, setPendingQualiAliasName] = useState("")
const [pendingQualiAliasTarget, setPendingQualiAliasTarget] = useState("")
const [dismissedQualiAliasNames, setDismissedQualiAliasNames] = useState<Record<string, true>>({})

const [uploadedLeagueHtmls, setUploadedLeagueHtmls] = useState<
  Partial<Record<ChampionshipLeagueKey, string>>
>({})
const [loadingLeagueHtmls, setLoadingLeagueHtmls] = useState<
  Partial<Record<ChampionshipLeagueKey, boolean>>
>({})
const [movementPanelOpen, setMovementPanelOpen] = useState(false)

const [movementDraftLeague, setMovementDraftLeague] =
  useState<ChampionshipLeagueKey>(selectedLeague)

const [movementDraftDriverName, setMovementDraftDriverName] = useState("")
const [movementDraftType, setMovementDraftType] = useState<MovementType>("promote")
const [movementDraftTargetLeague, setMovementDraftTargetLeague] =
  useState<ChampionshipLeagueKey>("ELITE")
const [movementDrawerAction, setMovementDrawerAction] =
  useState<MovementDrawerAction>("move")
  const [pendingMovementEntry, setPendingMovementEntry] =
  useState<LeagueMovementEntry | null>(null)

const [showMovementBaseModal, setShowMovementBaseModal] =
  useState(false)

const [movementBaseMode, setMovementBaseMode] =
  useState<"detected" | "manual">("detected")

const [movementManualBasePoints, setMovementManualBasePoints] =
  useState("")

const [detectedMovementBasePoints, setDetectedMovementBasePoints] =
  useState(0)

const [movementDraftTargetDriver, setMovementDraftTargetDriver] = useState("")
const [editingRaceCell, setEditingRaceCell] = useState<{
  driverKey: string
  race: 1 | 2
} | null>(null)
const [showBaselineModal, setShowBaselineModal] = useState(false)
const [baselineDraft, setBaselineDraft] = useState<DriverBaselineEntry[]>([])
const [showConfirmSaveLeagueModal, setShowConfirmSaveLeagueModal] = useState(false)
const [showSaveLeagueSuccessModal, setShowSaveLeagueSuccessModal] = useState(false)
const [showConfirmResetRaceModal, setShowConfirmResetRaceModal] = useState(false)
const [pendingSaveLeagueMode, setPendingSaveLeagueMode] = useState<"save" | "overwrite">("save")
const [lastSaveLeagueMode, setLastSaveLeagueMode] = useState<"save" | "overwrite">("save")
const [lastSavedLeagueName, setLastSavedLeagueName] = useState<ChampionshipLeagueKey | null>(null)

  const [showPilotModal, setShowPilotModal] = useState(false)
const [manualPilotDraft, setManualPilotDraft] = useState<Record<number, string>>({})
const [showAutoModal, setShowAutoModal] = useState(false)
const [manualAutoDraft, setManualAutoDraft] = useState<Record<number, string>>({})
const [showDistaccoModal, setShowDistaccoModal] = useState(false)
const [manualDistaccoDraft, setManualDistaccoDraft] = useState<Record<number, string>>({})
const [showQualiModal, setShowQualiModal] = useState(false)
const [manualQualiOverrides, setManualQualiOverrides] = useState<Record<number, string>>({})
const [manualQualiDraft, setManualQualiDraft] = useState<Record<number, string>>({})
const [showMovementCreatedModal, setShowMovementCreatedModal] = useState(false)
const [showApplyMovementsModal, setShowApplyMovementsModal] = useState(false)
const [showRemoveDsqDriversModal, setShowRemoveDsqDriversModal] = useState(false)
const [lastCreatedMovement, setLastCreatedMovement] = useState<LeagueMovementEntry | null>(null)
const [showApplyLastMovementModal, setShowApplyLastMovementModal] = useState(false)

  const [exportTexts, setExportTexts] = useState({
    mainTitle: "PRT - SEASON 2K26",
    sideLabel: "Inserire Circuito Attuale",
    subtitle: "Albixximo Timing Assistant",
  })
  const [pendingHeaderExportType, setPendingHeaderExportType] = useState<"png" | "championship-html" | null>(null)

  const [exportTextsDraft, setExportTextsDraft] = useState(exportTexts)

  const [dgOpen, setDgOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
const backupInputRef = useRef<HTMLInputElement | null>(null)
const htmlFilesInputRef = useRef<HTMLInputElement | null>(null)
const exportRef = useRef<HTMLDivElement | null>(null)
const championshipExportBannerRef = useRef<HTMLDivElement | null>(null)
const championshipExportTableRef = useRef<HTMLDivElement | null>(null)
const appHeaderExportRef = useRef<HTMLDivElement | null>(null)
const championshipHtmlExportRef = useRef<HTMLDivElement | null>(null)

  const canRun = useMemo(() => files.length >= 2, [files])
  const effectiveGara = useMemo(() => {
  const detected = String(unionMeta.gara || "").trim()
  return String(manualGaraOverride || detected || "").trim()
}, [manualGaraOverride, unionMeta.gara])

const effectiveLega = useMemo(() => {
  const detected = String(unionMeta.lega || "").trim()
  return String(manualLegaOverride || detected || "").trim()
}, [manualLegaOverride, unionMeta.lega])

const normalizedGaraForOutput = useMemo(() => {
  const raw = String(effectiveGara || "").trim()

  if (!raw) return "-"
  if (raw === "-") return "-"
  if (raw === "18") return "-"

  return raw
}, [effectiveGara])

const isSpecialGara7Platinum = useMemo(() => {
  const league = normalizeLeagueKey(effectiveLega) || selectedLeague
  return currentRace === 7 && league === "PLATINUM"
}, [currentRace, effectiveLega, selectedLeague])

  const penaltyCodeOptions = useMemo(() => {
  const maxPenaltyCode = currentRace >= 8 ? 31 : currentRace >= 6 ? 32 : 39

  return [
    { value: "DSQ", label: "DSQ (Squalifica)" },
    ...Array.from({ length: maxPenaltyCode }, (_, i) => {
      const n = i + 1
      const code = `P${String(n).padStart(2, "0")}`

      return {
        value: code,
        label: getPenaltyOptionText(code, currentRace),
      }
    }),
  ]
}, [currentRace])

  const lapOptions = useMemo(
    () => [
      "Lap -",
      ...Array.from({ length: 60 }, (_, i) => `Lap ${String(i + 1).padStart(2, "0")}`),
    ],
    []
  )

  const minuteOptions = useMemo(
    () => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")),
    []
  )

  const secondOptions = useMemo(
    () => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")),
    []
  )

  useEffect(() => {
  const style = document.createElement("style")
  style.innerHTML = `
    @keyframes unionLoadSlide {
      0% { left: -35%; }
      50% { left: 100%; }
      100% { left: -35%; }
    }

    @keyframes unionLoadShine {
      0% { left: -20%; }
      50% { left: 100%; }
      100% { left: -20%; }
    }
  `
  document.head.appendChild(style)

  return () => {
    document.head.removeChild(style)
  }
}, [])

useEffect(() => {
  setManualLegaOverride(selectedLeague)
}, [selectedLeague])

useEffect(() => {
  setMovementDraftLeague(selectedLeague)
}, [selectedLeague])

useEffect(() => {
  if (typeof window === "undefined") return

  try {
    const rawRace = window.localStorage.getItem(PRT_CURRENT_RACE_STORAGE_KEY)
    const parsedRace = Number(rawRace)
    if (Number.isFinite(parsedRace) && parsedRace >= 1 && parsedRace <= 13) {
      setCurrentRace(parsedRace)
    }

    const rawLeague = window.localStorage.getItem(PRT_SELECTED_LEAGUE_STORAGE_KEY)
    if (CHAMPIONSHIP_LEAGUES.includes(rawLeague as ChampionshipLeagueKey)) {
      setSelectedLeague(rawLeague as ChampionshipLeagueKey)
    }

    const rawState = window.localStorage.getItem(PRT_CHAMPIONSHIP_STORAGE_KEY)
    if (rawState) {
      const parsedState = JSON.parse(rawState)
      if (parsedState && typeof parsedState === "object" && typeof parsedState.races === "object") {
  setChampionshipState({
    races: parsedState.races || {},
    roundMovements:
      parsedState.roundMovements && typeof parsedState.roundMovements === "object"
        ? parsedState.roundMovements
        : {},
  })
}
    }

    const rawBaselines = window.localStorage.getItem(PRT_DRIVER_BASELINES_STORAGE_KEY)
    if (rawBaselines) {
      const parsedBaselines = JSON.parse(rawBaselines)
      if (Array.isArray(parsedBaselines)) {
        setDriverBaselines(parsedBaselines)
      }
    }

    const rawManualRace12 = window.localStorage.getItem(PRT_MANUAL_RACE12_STORAGE_KEY)
    if (rawManualRace12) {
      const parsedManualRace12 = JSON.parse(rawManualRace12)
      if (parsedManualRace12 && typeof parsedManualRace12 === "object") {
        setManualRace12Draft(parsedManualRace12)
      }
    }

    const rawDriverLeagueMap = window.localStorage.getItem(PRT_DRIVER_LEAGUE_MAP_STORAGE_KEY)
if (rawDriverLeagueMap) {
  const parsedDriverLeagueMap = JSON.parse(rawDriverLeagueMap)
  if (parsedDriverLeagueMap && typeof parsedDriverLeagueMap === "object") {
    const nextDriverLeagueMap: DriverLeagueMap = {
      ELITE: Array.isArray(parsedDriverLeagueMap.ELITE) ? parsedDriverLeagueMap.ELITE : [],
      PLATINUM: Array.isArray(parsedDriverLeagueMap.PLATINUM) ? parsedDriverLeagueMap.PLATINUM : [],
      MASTER: Array.isArray(parsedDriverLeagueMap.MASTER) ? parsedDriverLeagueMap.MASTER : [],
      PRO: Array.isArray(parsedDriverLeagueMap.PRO) ? parsedDriverLeagueMap.PRO : [],
      GT: Array.isArray(parsedDriverLeagueMap.GT) ? parsedDriverLeagueMap.GT : [],
    }

    setDriverLeagueMap(nextDriverLeagueMap)
    setWorkbenchDriverLeagueMap(cloneDriverLeagueMap(nextDriverLeagueMap))
  }
}

const rawDriverAliasMap = window.localStorage.getItem(PRT_DRIVER_ALIAS_MAP_STORAGE_KEY)
if (rawDriverAliasMap) {
  const parsedDriverAliasMap = JSON.parse(rawDriverAliasMap)
  if (parsedDriverAliasMap && typeof parsedDriverAliasMap === "object") {
    setDriverAliasMap({
      ELITE: parsedDriverAliasMap.ELITE && typeof parsedDriverAliasMap.ELITE === "object" ? parsedDriverAliasMap.ELITE : {},
      PLATINUM: parsedDriverAliasMap.PLATINUM && typeof parsedDriverAliasMap.PLATINUM === "object" ? parsedDriverAliasMap.PLATINUM : {},
      MASTER: parsedDriverAliasMap.MASTER && typeof parsedDriverAliasMap.MASTER === "object" ? parsedDriverAliasMap.MASTER : {},
      PRO: parsedDriverAliasMap.PRO && typeof parsedDriverAliasMap.PRO === "object" ? parsedDriverAliasMap.PRO : {},
      GT: parsedDriverAliasMap.GT && typeof parsedDriverAliasMap.GT === "object" ? parsedDriverAliasMap.GT : {},
    })
  }
}

const rawDriverRatingMap = window.localStorage.getItem(PRT_DRIVER_RATING_MAP_STORAGE_KEY)
if (rawDriverRatingMap) {
  const parsedDriverRatingMap = JSON.parse(rawDriverRatingMap)
  if (parsedDriverRatingMap && typeof parsedDriverRatingMap === "object") {
    setDriverRatingMap(parsedDriverRatingMap)
  }
}

  } catch {
    // nessuna azione
  }
}, [])

useEffect(() => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(PRT_CURRENT_RACE_STORAGE_KEY, String(currentRace))
}, [currentRace])

useEffect(() => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(PRT_SELECTED_LEAGUE_STORAGE_KEY, selectedLeague)
}, [selectedLeague])

useEffect(() => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(
    PRT_CHAMPIONSHIP_STORAGE_KEY,
    JSON.stringify(championshipState)
  )
}, [championshipState])

useEffect(() => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(
    PRT_DRIVER_BASELINES_STORAGE_KEY,
    JSON.stringify(driverBaselines)
  )
}, [driverBaselines])

useEffect(() => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(
    PRT_MANUAL_RACE12_STORAGE_KEY,
    JSON.stringify(manualRace12Draft)
  )
}, [manualRace12Draft])

useEffect(() => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(
    PRT_DRIVER_LEAGUE_MAP_STORAGE_KEY,
    JSON.stringify(workbenchDriverLeagueMap)
  )
}, [workbenchDriverLeagueMap])

useEffect(() => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(
    PRT_DRIVER_ALIAS_MAP_STORAGE_KEY,
    JSON.stringify(driverAliasMap)
  )
}, [driverAliasMap])

useEffect(() => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(
    PRT_DRIVER_RATING_MAP_STORAGE_KEY,
    JSON.stringify(driverRatingMap)
  )
}, [driverRatingMap])

useEffect(() => {
  console.log("uploadedLeagueHtmls changed:", uploadedLeagueHtmls)
}, [uploadedLeagueHtmls])

useEffect(() => {
  const snapshot = championshipState.races[currentRace]?.[selectedLeague]

  if (snapshot) {
    reopenSavedLeague(selectedLeague)
    return
  }

  clearCurrentWorkbench(false)
  setManualLegaOverride(selectedLeague)
  setWorkbenchDriverLeagueMap(cloneDriverLeagueMap(driverLeagueMap))
  setUnknownDriverSelections({})
  setDismissedUnknownDrivers({})
}, [currentRace, selectedLeague, championshipState])

function normalizeDriverNameForChampionship(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_\-.]+/g, "")
    .replace(/\s+/g, "")
}

function isMovementRound(round: number) {
  return round === 3 || round === 6 || round === 9 || round === 12
}

function getAdjacentLeagues(league: ChampionshipLeagueKey): ChampionshipLeagueKey[] {
  const index = CHAMPIONSHIP_LEAGUES.indexOf(league)
  if (index === -1) return []

  const result: ChampionshipLeagueKey[] = []

  if (index > 0) {
    result.push(CHAMPIONSHIP_LEAGUES[index - 1])
  }

  if (index < CHAMPIONSHIP_LEAGUES.length - 1) {
    result.push(CHAMPIONSHIP_LEAGUES[index + 1])
  }

  return result
}

function isAutomaticRecalculationRound(round: number) {
  return round === 6 || round === 9 || round === 12
}

function getPreviousThreeRounds(round: number): number[] {
  if (round === 3) return [1, 2]
  if (round === 6) return [3, 4, 5]
  if (round === 9) return [6, 7, 8]
  if (round === 12) return [9, 10, 11]
  return []
}

function getMovementMultiplier(type: MovementType): number {
  if (type === "promote") return 0.6
  if (type === "relegate") return 1.5
  return 1
}

function roundUpPoints(value: number): number {
  return Math.ceil(value)
}

function getPrtBasePointsByPosition(pos: number): number {
  const basePointsMap: Record<number, number> = {
    1: 30,
    2: 27,
    3: 24,
    4: 22,
    5: 20,
    6: 18,
    7: 16,
    8: 14,
    9: 12,
    10: 9,
    11: 7,
    12: 5,
    13: 3,
    14: 1,
  }

  return basePointsMap[pos] ?? 0
}

function normalizeChampionshipCellInput(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
}

function parseManualChampionshipCell(value: string): ChampionshipRaceCell | null {
  const raw = normalizeChampionshipCellInput(value)
  if (!raw) return null

  const tokens = raw.split(" ").filter(Boolean)
  if (tokens.length === 0) return null

  const hasPp = tokens.includes("pp")
  const hasGv = tokens.includes("gv")

  const cleanedTokens = tokens.filter((token) => token !== "pp" && token !== "gv")
  if (cleanedTokens.length !== 1) return null

  let core = cleanedTokens[0]
  let specialMovement: "promote" | "relegate" | null = null

  if (core.endsWith("+")) {
    specialMovement = "promote"
    core = core.slice(0, -1).trim()
  } else if (core.endsWith("-")) {
    specialMovement = "relegate"
    core = core.slice(0, -1).trim()
  }

  if (/^\d+$/.test(core)) {
    const position = Number(core)
    if (!Number.isFinite(position) || position <= 0) return null

    let points = getPrtBasePointsByPosition(position)

    if (specialMovement === "promote") {
      points = Math.ceil(points * 0.6)
    } else if (specialMovement === "relegate") {
      points = Math.ceil(points * 1.5)
    }

    points += (hasPp ? 1 : 0) + (hasGv ? 1 : 0)

    return {
      position,
      status: null,
      pp: hasPp,
      gv: hasGv,
      points,
      rawText: raw,
      specialMovement,
    }
  }

  if (core === "dnf" || core === "dnf-i") {
    return {
      position: null,
      status: core === "dnf-i" ? "DNF-I" : "DNF",
      pp: hasPp,
      gv: hasGv,
      points: (hasPp ? 1 : 0) + (hasGv ? 1 : 0),
      rawText: raw,
      specialMovement,
    }
  }

  if (core === "dnfv" || core === "dnf-v") {
  if (hasPp || hasGv) return null
  return {
    position: null,
    status: "DNFV",
    pp: false,
    gv: false,
    points: 0,
    rawText: raw,
    specialMovement,
  }
}

  if (core === "dnp") {
    if (hasPp || hasGv) return null
    return {
      position: null,
      status: "DNP",
      pp: false,
      gv: false,
      points: 0,
      rawText: raw,
      specialMovement,
    }
  }

  if (core === "box") {
    if (hasPp || hasGv) return null
    return {
      position: null,
      status: "BOX",
      pp: false,
      gv: false,
      points: 0,
      rawText: raw,
      specialMovement,
    }
  }

  if (core === "dsq") {
    if (hasPp || hasGv) return null
    return {
      position: null,
      status: "DSQ",
      pp: false,
      gv: false,
      points: 0,
      rawText: raw,
      specialMovement,
    }
  }

  if (core === "doppiato") {
    if (hasPp || hasGv) return null
    return {
      position: null,
      status: null,
      pp: false,
      gv: false,
      points: 0,
      rawText: raw,
      specialMovement,
    }
  }

  return null
}

function buildSavedRaceCell(row: DisplayRow, bestRaceLap: string): ChampionshipRaceCell {
  const rawTempo = tempoLikeGt7(row).trim().toUpperCase()
  const isPole = (row.pole || "").trim().toUpperCase() === "POLE"
  const bestLapTime = (bestRaceLap.split("  ").pop() || "").trim()
  const isBestLap = !!bestLapTime && (row.migliorGiroGara || "").trim() === bestLapTime

  let status: ChampionshipCellStatus | null = null

  if (rawTempo === "DNF") status = "DNF"
  else if (rawTempo === "DNF-I") status = "DNF-I"
  else if (rawTempo === "DNFV") status = "DNFV"
  else if (rawTempo === "DNP") status = "DNP"
  else if (rawTempo === "BOX") status = "BOX"
  else if (rawTempo === "DSQ") status = "DSQ"

  return {
    position: status ? null : row.posGara,
    status,
    pp: isPole,
    gv: isBestLap,
    points: 0,
  }
}

function buildSnapshotRacePointsMap(
  finalRows: DisplayRow[],
  bestRaceLap: string
): Record<string, number> {
  const pointsMap: Record<string, number> = {}

  const bestLapTime = (bestRaceLap.split("  ").pop() || "").trim()

  const arrivedRows = finalRows.filter((row) => {
    const rawTempo = tempoLikeGt7(row).trim().toUpperCase()
    return (
      rawTempo !== "DNF" &&
      rawTempo !== "DNF-I" &&
      rawTempo !== "DNFV" &&
      rawTempo !== "DNP" &&
      rawTempo !== "BOX" &&
      rawTempo !== "DSQ"
    )
  })

  const dnfRows = finalRows.filter((row) => {
    const rawTempo = tempoLikeGt7(row).trim().toUpperCase()
    return rawTempo === "DNF" || rawTempo === "DNF-I"
  })

  const dnfvRows = finalRows.filter((row) => {
    const rawTempo = tempoLikeGt7(row).trim().toUpperCase()
    return rawTempo === "DNFV"
  })

  const dnpBoxDsqRows = finalRows.filter((row) => {
    const rawTempo = tempoLikeGt7(row).trim().toUpperCase()
    return rawTempo === "DNP" || rawTempo === "BOX" || rawTempo === "DSQ"
  })

  for (const row of arrivedRows) {
    const isPole = (row.pole || "").trim().toUpperCase() === "POLE"
    const isBestLap =
      !!bestLapTime && (row.migliorGiroGara || "").trim() === bestLapTime

    let points = getPrtBasePointsByPosition(row.posGara)
    if (isPole) points += 1
    if (isBestLap) points += 1

    pointsMap[row.pilota] = points
  }

    let nextDnfPosition = arrivedRows.length + 1

  for (const row of dnfRows) {
    const isPole = (row.pole || "").trim().toUpperCase() === "POLE"
    const isBestLap =
      !!bestLapTime && (row.migliorGiroGara || "").trim() === bestLapTime

    const rawTempo = tempoLikeGt7(row).trim().toUpperCase()
    const isDnfI = rawTempo === "DNF-I"

    let points = getPrtBasePointsByPosition(
      isDnfI ? row.posGara : nextDnfPosition
    )

    if (isPole) points += 1
    if (isBestLap) points += 1

    pointsMap[row.pilota] = points

    if (!isDnfI) {
      nextDnfPosition += 1
    }
  }

  for (const row of dnfvRows) {
    pointsMap[row.pilota] = 0
  }

  for (const row of dnpBoxDsqRows) {
    pointsMap[row.pilota] = 0
  }

  return pointsMap
}

function createDnpDisplayRow(pilota: string, posGara: number): DisplayRow {
  return {
    sourcePosGara: 1000 + posGara,
    posGara,
    pilota,
    auto: "---",
    tempoTotaleGara: "DNP",
    distaccoDalPrimo: "DNP",
    migliorGiroGara: "",
    tempoQualifica: "",
    pole: "",
  }
}

function buildDnpRaceCell(): ChampionshipRaceCell {
  return {
    position: null,
    status: "DNP",
    pp: false,
    gv: false,
    points: 0,
    rawText: "dnp",
  }
}

function applyFourthDnpAsDsqRule(driver: DriverChampionshipRow) {
  let dnpCount = 0

  for (let raceNumber = 1; raceNumber <= 13; raceNumber++) {
    const cell = driver.raceResults[raceNumber]
    if (!cell) continue

    if (cell.status === "DNP") {
      dnpCount += 1

      if (dnpCount >= 4) {
        driver.raceResults[raceNumber] = {
          ...cell,
          status: "DSQ",
          points: 0,
          rawText: "dsq",
        }

        driver.racePoints[raceNumber] = 0
      }
    }
  }
}

function getDnpDisqualificationRace(driver: DriverChampionshipRow): number | null {
  let dnpOrDsqCount = 0

  for (let raceNumber = 1; raceNumber <= 13; raceNumber++) {
    const cell = driver.raceResults[raceNumber]
    if (!cell) continue

    if (cell.status === "DNP" || cell.status === "DSQ") {
      dnpOrDsqCount += 1

      if (dnpOrDsqCount >= 4) {
        return raceNumber
      }
    }
  }

  return null
}

function RaceCellStars({ pp, gv }: { pp: boolean; gv: boolean }) {
  if (!pp && !gv) return null

  return (
    <span
      style={{
        position: "absolute",
        top: -6,
        right: pp && gv ? -14 : -9,
        display: "flex",
        gap: 1,
        fontSize: 10,
        lineHeight: 1,
      }}
    >
      {pp && (
        <span
          style={{
            color: "#ffd700",
            textShadow: "0 0 6px rgba(255,215,0,0.45)",
          }}
        >
          ★
        </span>
      )}

      {gv && (
        <span
          style={{
            color: "#b67cff",
            textShadow: "0 0 6px rgba(160,90,255,0.45)",
          }}
        >
          ★
        </span>
      )}
    </span>
  )
}

const PRT_CHAMPIONSHIP_TABLE_STYLES = {
  wrapper: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.050), rgba(255,255,255,0.024))",
    padding: 16,
    display: "grid",
    gap: 14,
    boxShadow: "0 12px 34px rgba(0,0,0,0.24)",
  } satisfies React.CSSProperties,

  wrapperExport: {
    borderRadius: 22,
    border: "1px solid rgba(255,255,255,0.12)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.028))",
    padding: 18,
    display: "grid",
    gap: 16,
    boxShadow: "0 16px 42px rgba(0,0,0,0.30)",
  } satisfies React.CSSProperties,

  headRow: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 14,
    alignItems: "center",
    paddingBottom: 2,
  } satisfies React.CSSProperties,

  headRowExport: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
    alignItems: "center",
    paddingBottom: 2,
  } satisfies React.CSSProperties,

  headTitleWrap: {
    display: "grid",
    gap: 5,
  } satisfies React.CSSProperties,

  headTitleWrapExport: {
    display: "grid",
    gap: 6,
  } satisfies React.CSSProperties,

  headTitle: {
    fontWeight: 900,
    opacity: 0.98,
    fontSize: 18,
    letterSpacing: 0.25,
    lineHeight: 1.05,
    color: "#ffffff",
    textShadow: "0 0 12px rgba(255,215,0,0.08)",
  } satisfies React.CSSProperties,

  headTitleExport: {
    fontWeight: 900,
    opacity: 1,
    fontSize: 20,
    letterSpacing: 0.3,
    lineHeight: 1.05,
    color: "#ffffff",
    textShadow: "0 0 16px rgba(255,215,0,0.12)",
  } satisfies React.CSSProperties,

  headSubtitle: {
    fontSize: 12,
    opacity: 0.76,
    lineHeight: 1.35,
    color: "rgba(255,255,255,0.82)",
    letterSpacing: 0.15,
  } satisfies React.CSSProperties,

  headSubtitleExport: {
    fontSize: 13,
    opacity: 0.84,
    lineHeight: 1.4,
    color: "rgba(255,255,255,0.86)",
    letterSpacing: 0.18,
  } satisfies React.CSSProperties,

  headMeta: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    opacity: 0.92,
    padding: "9px 14px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))",
    whiteSpace: "nowrap",
    fontWeight: 900,
    letterSpacing: 0.3,
    boxShadow: "0 0 14px rgba(255,255,255,0.04)",
  } satisfies React.CSSProperties,

  headMetaExport: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    opacity: 0.96,
    padding: "10px 16px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.045))",
    whiteSpace: "nowrap",
    fontWeight: 900,
    letterSpacing: 0.35,
    boxShadow: "0 0 18px rgba(255,255,255,0.05)",
  } satisfies React.CSSProperties,

  tableWrap: {
    borderRadius: 13,
    border: "1px solid rgba(255,255,255,0.08)",
    overflow: "hidden",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
  } satisfies React.CSSProperties,

  tableWrapExport: {
    borderRadius: 15,
    border: "1px solid rgba(255,255,255,0.10)",
    overflowX: "auto",
    overflowY: "hidden",
    WebkitOverflowScrolling: "touch",
    boxShadow: "0 8px 24px rgba(0,0,0,0.20)",
  } satisfies React.CSSProperties,

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
    fontWeight: 400,
    letterSpacing: 0,
    textRendering: "optimizeLegibility",
    WebkitFontSmoothing: "antialiased",
    tableLayout: "fixed",
  } satisfies React.CSSProperties,

  tableExport: {
    width: "100%",
    minWidth: 1220,
    borderCollapse: "collapse",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
    fontWeight: 400,
    letterSpacing: 0,
    textRendering: "optimizeLegibility",
    WebkitFontSmoothing: "antialiased",
    tableLayout: "fixed",
  } satisfies React.CSSProperties,

  thead: {
    background:
      "linear-gradient(180deg, rgba(18,22,31,0.98), rgba(8,10,15,0.98))",
    boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.06)",
  } satisfies React.CSSProperties,

  theadExport: {
    background:
      "linear-gradient(180deg, rgba(20,24,34,0.995), rgba(10,12,18,0.995))",
    boxShadow:
      "inset 0 -1px 0 rgba(255,255,255,0.08), 0 8px 20px rgba(0,0,0,0.18)",
  } satisfies React.CSSProperties,

  thBase: {
    padding: "12px 4px",
    fontSize: 12,
    textAlign: "center" as const,
    fontWeight: 900,
    opacity: 0.92,
    whiteSpace: "nowrap" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.35,
    color: "rgba(255,255,255,0.88)",
  },

  thBaseExport: {
    padding: "13px 4px",
    fontSize: 13,
    textAlign: "center" as const,
    fontWeight: 900,
    opacity: 0.98,
    whiteSpace: "nowrap" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.45,
    color: "rgba(255,255,255,0.94)",
  },

  tbody: {
    fontWeight: 400,
    letterSpacing: 0,
  } satisfies React.CSSProperties,

  tbodyExport: {
    fontWeight: 400,
    letterSpacing: 0,
  } satisfies React.CSSProperties,

  rowEven: {
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.030), rgba(255,255,255,0.018))",
  } satisfies React.CSSProperties,

  rowOdd: {
    background:
      "linear-gradient(180deg, rgba(0,0,0,0.14), rgba(0,0,0,0.10))",
  } satisfies React.CSSProperties,

  rowEvenExport: {
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.040), rgba(255,255,255,0.022))",
  } satisfies React.CSSProperties,

  rowOddExport: {
    background:
      "linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.12))",
  } satisfies React.CSSProperties,

  col: {
    pos: { width: 60, minWidth: 60, maxWidth: 60 },
    pilota: { width: 150, minWidth: 150 },
    rating: { width: 150, minWidth: 150, maxWidth: 150 },
    gara: { width: 66, minWidth: 66, maxWidth: 66 },
    totale: { width: 70, minWidth: 70, maxWidth: 70 },
  },

  posCell: {
    fontSize: 13,
    fontWeight: 800,
    color: "rgba(255,255,255,0.92)",
  } satisfies React.CSSProperties,

  posCellExport: {
    fontSize: 14,
    fontWeight: 900,
    color: "rgba(255,255,255,0.96)",
  } satisfies React.CSSProperties,

  pilotCell: {
    fontSize: 15,
    fontWeight: 900,
    color: "rgba(255,255,255,0.94)",
    letterSpacing: 0.1,
  } satisfies React.CSSProperties,

  pilotCellExport: {
    fontSize: 15,
    fontWeight: 900,
    color: "rgba(255,255,255,0.98)",
    letterSpacing: 0.12,
  } satisfies React.CSSProperties,

  ratingCell: {
    whiteSpace: "nowrap" as const,
    width: 92,
    minWidth: 92,
    maxWidth: 92,
    padding: "9px 4px",
  } satisfies React.CSSProperties,

  ratingCellExport: {
    whiteSpace: "nowrap" as const,
    width: 92,
    minWidth: 92,
    maxWidth: 92,
    padding: "10px 4px",
  } satisfies React.CSSProperties,

  garaCell: {
    whiteSpace: "nowrap" as const,
    width: 66,
    minWidth: 66,
    maxWidth: 66,
    padding: "9px 1px",
  } satisfies React.CSSProperties,

  garaCellExport: {
    whiteSpace: "nowrap" as const,
    width: 66,
    minWidth: 66,
    maxWidth: 66,
    padding: "10px 1px",
  } satisfies React.CSSProperties,

  totalCell: {
    width: 70,
    minWidth: 70,
    maxWidth: 70,
    fontWeight: 900,
    fontSize: 13,
    whiteSpace: "nowrap" as const,
    color: "rgba(255,255,255,0.96)",
  } satisfies React.CSSProperties,

  totalCellExport: {
    width: 70,
    minWidth: 70,
    maxWidth: 70,
    fontWeight: 900,
    fontSize: 14,
    whiteSpace: "nowrap" as const,
    color: "#ffffff",
    textShadow: "0 0 10px rgba(255,255,255,0.08)",
  } satisfies React.CSSProperties,

  raceCellInner: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
    fontWeight: 500,
  } satisfies React.CSSProperties,

  raceCellInnerExport: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 30,
    fontWeight: 600,
  } satisfies React.CSSProperties,
}

function CompactChampionshipPill({
  left,
  variant,
  exporting = false,
}: {
  left: string
  variant: "orange" | "teal" | "fuchsia" | "dsq" | "dnp"
  exporting?: boolean
}) {
  const styles: Record<typeof variant, React.CSSProperties> = {
    orange: {
      background: "linear-gradient(180deg, rgba(255,165,0,0.95), rgba(255,140,0,0.85))",
      border: "1px solid rgba(255,165,0,0.55)",
      boxShadow: "0 0 18px rgba(255,165,0,0.18)",
    },
    teal: {
      background: "linear-gradient(180deg, rgba(64,224,208,0.95), rgba(32,200,185,0.85))",
      border: "1px solid rgba(64,224,208,0.55)",
      boxShadow: "0 0 18px rgba(64,224,208,0.16)",
    },
    fuchsia: {
      background: "linear-gradient(180deg, rgba(255,0,128,0.95), rgba(220,0,110,0.85))",
      border: "1px solid rgba(255,0,128,0.55)",
      boxShadow: "0 0 18px rgba(255,0,128,0.18)",
    },
    dsq: {
      background: "linear-gradient(180deg, rgba(255,0,255,0.95), rgba(200,0,200,0.85))",
      border: "1px solid rgba(255,0,255,0.60)",
      boxShadow: "0 0 20px rgba(255,0,255,0.22)",
    },
    dnp: {
      background: "linear-gradient(180deg, rgba(170,255,170,0.95), rgba(120,235,160,0.88))",
      border: "1px solid rgba(170,255,170,0.58)",
      boxShadow: "0 0 18px rgba(170,255,170,0.18)",
    },
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",

        minWidth: 44,
        height: 31,
        padding: "0 9px",

        transform: "none",
        transformOrigin: "center",

        borderRadius: 14,

        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 0.2,
        textTransform: "uppercase",

        whiteSpace: "nowrap",
        lineHeight: 1,
        color:
  variant === "fuchsia" || variant === "dsq"
    ? "#ffffff"
    : "rgba(0,0,0,0.92)",
        fontFamily: "Arial, Helvetica, sans-serif",
        verticalAlign: "middle",

        ...styles[variant],
      }}
    >
      {left}
    </span>
  )
}

function CompactChampionshipPositionBadge({
  value,
  exporting = false,
}: {
  value: string
  exporting?: boolean
}) {
  const numeric = Number(value.replace("°", ""))
  const isP1 = numeric === 1
  const isP2 = numeric === 2
  const isP3 = numeric === 3
  const isPodium = isP1 || isP2 || isP3

  const podiumBg = isP1
    ? "linear-gradient(180deg, rgba(255,215,0,1), rgba(255,200,0,0.94))"
    : isP2
      ? "linear-gradient(180deg, rgba(230,230,230,0.98), rgba(185,185,185,0.94))"
      : "linear-gradient(180deg, rgba(205,127,50,0.98), rgba(168,102,38,0.94))"

  const podiumBorder = isP1
    ? "1px solid rgba(255,215,0,0.58)"
    : isP2
      ? "1px solid rgba(220,220,220,0.46)"
      : "1px solid rgba(205,127,50,0.48)"

  const podiumGlow = isP1
    ? exporting
      ? "0 0 20px rgba(255,215,0,0.32)"
      : "0 0 14px rgba(255,215,0,0.20)"
    : isP2
      ? exporting
        ? "0 0 16px rgba(220,220,220,0.24)"
        : "0 0 12px rgba(220,220,220,0.14)"
      : exporting
        ? "0 0 16px rgba(205,127,50,0.24)"
        : "0 0 12px rgba(205,127,50,0.14)"

  if (isPodium) {
    return (
      <span
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          minWidth: exporting ? 40 : 38,
          height: exporting ? 25 : 24,
          padding: exporting ? "0 11px" : "0 10px",
          borderRadius: 999,
          background: podiumBg,
          border: podiumBorder,
          boxShadow: podiumGlow,
          color: "rgba(0,0,0,0.95)",
          fontWeight: exporting ? 800 : 700,
          fontSize: exporting ? 13 : 12,
          lineHeight: 1,
          transform: "translateY(-1px)",
          whiteSpace: "nowrap",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
          letterSpacing: 0.1,
        }}
      >
        <span>{value}</span>
      </span>
    )
  }

  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        minWidth: exporting ? 40 : 38,
        height: exporting ? 24 : 23,
        padding: exporting ? "0 11px" : "0 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.20)",
        background: exporting
          ? "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))"
          : "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
        boxShadow: exporting
          ? "inset 0 1px 0 rgba(255,255,255,0.04), 0 0 10px rgba(255,255,255,0.04)"
          : "none",
        color: exporting ? "#ffffff" : "#ecfff5",
        fontWeight: exporting ? 200 : 100,
        fontSize: exporting ? 16 : 15,
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        letterSpacing: 0.1,
        textShadow: exporting
          ? "0 0 8px rgba(255,255,255,0.08)"
          : "0 0 8px rgba(64,224,208,0.10)",
        whiteSpace: "nowrap",
      }}
    >
      <span>{value}</span>
    </span>
  )
}

function ChampionshipStars({
  pp,
  gv,
  exporting = false,
}: {
  pp: boolean
  gv: boolean
  exporting?: boolean
}) {
  if (!pp && !gv) return null

  return (
    <span
      style={{
        position: "absolute",
        top: exporting ? -6 : -5,
        right: pp && gv
          ? (exporting ? -13 : -12)
          : (exporting ? -8 : -7),
        display: "flex",
        gap: exporting ? 2 : 1,
        fontSize: exporting ? 11 : 9,
        lineHeight: 1,
        pointerEvents: "none",
      }}
    >
      {pp && (
        <span
          style={{
            color: "#ffd700",
            textShadow: exporting
              ? "0 0 8px rgba(255,215,0,0.55)"
              : "0 0 6px rgba(255,215,0,0.45)",
          }}
        >
          ★
        </span>
      )}

      {gv && (
        <span
          style={{
            color: "#b67cff",
            textShadow: exporting
              ? "0 0 8px rgba(160,90,255,0.55)"
              : "0 0 6px rgba(160,90,255,0.45)",
          }}
        >
          ★
        </span>
      )}
    </span>
  )
}

function renderMovementWrapper(
  content: React.ReactNode,
  specialMovement: "promote" | "relegate" | null,
  exporting = false
) {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        verticalAlign: "middle",
        lineHeight: 0,
        overflow: "visible",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
        }}
      >
        {content}
      </span>

      {specialMovement === "promote" && (
        <span
          style={{
            position: "absolute",
            bottom: exporting ? -11 : -10,
            right: exporting ? -8 : -7,
            fontSize: exporting ? 20 : 18,
            lineHeight: 1,
            color: "#22c55e",
            fontWeight: 900,
            textShadow: "0 0 8px rgba(34,197,94,0.45)",
            pointerEvents: "none",
          }}
          title="Promosso subito dopo Gara 1"
        >
          ▲
        </span>
      )}

      {specialMovement === "relegate" && (
        <span
          style={{
            position: "absolute",
            bottom: exporting ? -11 : -10,
            right: exporting ? -8 : -7,
            fontSize: exporting ? 20 : 18,
            lineHeight: 1,
            color: "#ef4444",
            fontWeight: 900,
            textShadow: "0 0 8px rgba(239,68,68,0.45)",
            pointerEvents: "none",
          }}
          title="Retrocesso subito dopo Gara 1"
        >
          ▼
        </span>
      )}
    </span>
  )
}

function renderChampionshipRaceCell(
  cell: ChampionshipRaceCell | null,
  exporting = false
) {
  if (!cell) return null

  const position = cell.position ?? null
  const status = cell.status ?? null
  const specialMovement = cell.specialMovement ?? null

  const allowStarsOnStatus = status === "DNF" || status === "DNF-I"
  const pp = allowStarsOnStatus ? (cell.pp ?? false) : false
  const gv = allowStarsOnStatus ? (cell.gv ?? false) : false

  function wrapWithOptionalStars(content: React.ReactNode) {
    return renderMovementWrapper(
      <span
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {content}
        {(pp || gv) ? (
          <ChampionshipStars pp={pp} gv={gv} exporting={exporting} />
        ) : null}
      </span>,
      specialMovement,
      exporting
    )
  }

  if (status === "DNF") {
    return wrapWithOptionalStars(
      <CompactChampionshipPill
        left="DNF"
        variant="teal"
        exporting={exporting}
      />
    )
  }

  if (status === "DNF-I") {
    return wrapWithOptionalStars(
      <CompactChampionshipPill
        left="DNF-I"
        variant="teal"
        exporting={exporting}
      />
    )
  }

  if (status === "DNFV") {
    return renderMovementWrapper(
      <CompactChampionshipPill
        left="DNF-V"
        variant="teal"
        exporting={exporting}
      />,
      specialMovement,
      exporting
    )
  }

  if (status === "BOX") {
    return renderMovementWrapper(
      <CompactChampionshipPill
        left="BOX"
        variant="fuchsia"
        exporting={exporting}
      />,
      specialMovement,
      exporting
    )
  }

  if (status === "DSQ") {
    return renderMovementWrapper(
      <CompactChampionshipPill
        left="DSQ"
        variant="dsq"
        exporting={exporting}
      />,
      specialMovement,
      exporting
    )
  }

  if (status === "DNP") {
    return renderMovementWrapper(
      <CompactChampionshipPill
        left="DNP"
        variant="dnp"
        exporting={exporting}
      />,
      specialMovement,
      exporting
    )
  }

  if (status === "DOPPIATO") {
    return renderMovementWrapper(
      <CompactChampionshipPill
        left="DOPPIATO"
        variant="orange"
        exporting={exporting}
      />,
      specialMovement,
      exporting
    )
  }

  if (position && position > 0) {
    return renderMovementWrapper(
      <span
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CompactChampionshipPositionBadge
          value={`${position}°`}
          exporting={exporting}
        />
        <ChampionshipStars
          pp={cell.pp ?? false}
          gv={cell.gv ?? false}
          exporting={exporting}
        />
      </span>,
      specialMovement,
      exporting
    )
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        minWidth: exporting ? 34 : 30,
        height: exporting ? 22 : 20,
        padding: exporting ? "0 8px" : "0 7px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.04)",
        color: "rgba(255,255,255,0.42)",
        fontWeight: 800,
        fontSize: exporting ? 12 : 11,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      -
    </span>
  )
}

function ChampionshipHtmlLegend() {
  const rowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "140px 1fr",
    gap: 14,
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  }

  const textStyle: React.CSSProperties = {
    fontSize: 13,
    lineHeight: 1.45,
    color: "rgba(255,255,255,0.82)",
  }

  const badgeWrapStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    minHeight: 32,
  }

  const promoArrowSize = 20
  const relegateArrowSize = 20
  const poleStarSize = 18
  const bestLapStarSize = 18

  return (
    <div
      data-html-legend="true"
      style={{
        display: "flex",
        justifyContent: "flex-start",
        width: "100%",
      }}
    >
      <details
        style={{
          width: "100%",
          maxWidth: 660,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.04)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.22)",
          overflow: "hidden",
        }}
      >
        <summary
          style={{
            listStyle: "none",
            cursor: "pointer",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            fontSize: 13,
            fontWeight: 900,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            color: "white",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
            userSelect: "none",
          }}
        >
          <span>Mostra legenda</span>
          <span style={{ opacity: 0.72, fontSize: 11 }}>Tap / Click</span>
        </summary>

        <div
          style={{
            padding: 16,
            display: "grid",
            gap: 4,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: 0.35,
              textTransform: "uppercase",
              opacity: 0.88,
              marginBottom: 4,
            }}
          >
            Legenda stati classifica
          </div>

          <div style={rowStyle}>
            <div style={badgeWrapStyle}>
              <CompactChampionshipPill left="DNP" variant="dnp" exporting={true} />
            </div>
            <div style={textStyle}>Non presente.</div>
          </div>

          <div style={rowStyle}>
            <div style={badgeWrapStyle}>
              <CompactChampionshipPill left="DNF-I" variant="teal" exporting={true} />
            </div>
            <div style={textStyle}>Crash / abbandono involontario.</div>
          </div>

          <div style={rowStyle}>
            <div style={badgeWrapStyle}>
              <CompactChampionshipPill left="DNF-V" variant="teal" exporting={true} />
            </div>
            <div style={textStyle}>Abbandono volontario.</div>
          </div>

          <div style={rowStyle}>
            <div style={badgeWrapStyle}>
              <CompactChampionshipPill left="BOX" variant="fuchsia" exporting={true} />
            </div>
            <div style={textStyle}>Pilota rientrato ai box / non classificato in pista.</div>
          </div>

          <div style={rowStyle}>
            <div style={badgeWrapStyle}>
              <CompactChampionshipPill left="DSQ" variant="dsq" exporting={true} />
            </div>
            <div style={textStyle}>Squalifica.</div>
          </div>

          <div style={rowStyle}>
            <div style={badgeWrapStyle}>
              <CompactChampionshipPill left="DOPPIATO" variant="orange" exporting={true} />
            </div>
            <div style={textStyle}>Pilota con uno o più giri di ritardo.</div>
          </div>

          <div style={rowStyle}>
            <div style={badgeWrapStyle}>
              <span
                style={{
                  fontSize: promoArrowSize,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: "#22c55e",
                  textShadow: "0 0 8px rgba(34,197,94,0.45)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 28,
                }}
              >
                ▲
              </span>
            </div>
            <div style={textStyle}>Promozione.</div>
          </div>

          <div style={rowStyle}>
            <div style={badgeWrapStyle}>
              <span
                style={{
                  fontSize: relegateArrowSize,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: "#ef4444",
                  textShadow: "0 0 8px rgba(239,68,68,0.45)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 28,
                }}
              >
                ▼
              </span>
            </div>
            <div style={textStyle}>Retrocessione.</div>
          </div>

          <div style={rowStyle}>
            <div style={badgeWrapStyle}>
              <span
                style={{
                  fontSize: poleStarSize,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: "#facc15",
                  textShadow: "0 0 8px rgba(250,204,21,0.45)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 28,
                }}
              >
                ★
              </span>
            </div>
            <div style={textStyle}>Pole position.</div>
          </div>

          <div style={rowStyle}>
            <div style={badgeWrapStyle}>
              <span
                style={{
                  fontSize: bestLapStarSize,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: "#a855f7",
                  textShadow: "0 0 8px rgba(168,85,247,0.45)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 28,
                }}
              >
                ★
              </span>
            </div>
            <div style={textStyle}>Giro veloce.</div>
          </div>

          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: "1px solid rgba(255,255,255,0.08)",
              display: "grid",
              gap: 10,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 0.35,
                textTransform: "uppercase",
                opacity: 0.88,
              }}
            >
              Rating pilota
            </div>

            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(96,165,250,0.18)",
                background:
                  "linear-gradient(180deg, rgba(96,165,250,0.10), rgba(255,255,255,0.02))",
                boxShadow: "0 0 18px rgba(96,165,250,0.08)",
                padding: "12px 14px",
                display: "grid",
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: 16,
                    lineHeight: 1,
                    color: "#facc15",
                    textShadow: "0 0 8px rgba(250,204,21,0.45)",
                  }}
                >
                  ★★★★★
                </span>

                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: "#ffffff",
                    letterSpacing: 0.2,
                  }}
                >
                  Sportività pilota
                </span>
              </div>

              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "rgba(255,255,255,0.84)",
                }}
              >
                Il <b>Rating</b> rappresenta il livello di sportività del pilota durante il
                campionato: correttezza in pista, rispetto degli avversari, gestione dei
                duelli, presenze e comportamento generale.
              </div>
            </div>
          </div>
        </div>
      </details>
    </div>
  )
}

function ChampionshipHtmlMovements({
  currentRace,
  championshipState,
  selectedLeague,
}: {
  currentRace: number
  championshipState: ChampionshipState
  selectedLeague: ChampionshipLeagueKey
}) {
  if (![3, 6, 9, 12].includes(currentRace)) return null

  const roundMovementState = championshipState.roundMovements?.[currentRace] || {}

  const promotions: string[] = []
  const relegations: string[] = []

  for (const league of CHAMPIONSHIP_LEAGUES) {
    const entries = roundMovementState[league] || []

    for (const entry of entries) {
      const involvesSelectedLeague =
        entry.fromLeague === selectedLeague || entry.toLeague === selectedLeague

      if (!involvesSelectedLeague) continue

      if (entry.type === "promote") {
        promotions.push(`${entry.driverName} • ${entry.fromLeague} → ${entry.toLeague}`)
      }

      if (entry.type === "relegate") {
        relegations.push(`${entry.driverName} • ${entry.fromLeague} → ${entry.toLeague}`)
      }
    }
  }

  const hasMovements = promotions.length > 0 || relegations.length > 0

  const rowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "120px 1fr",
    gap: 14,
    alignItems: "start",
    padding: "10px 0",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  }

  const textStyle: React.CSSProperties = {
    fontSize: 13,
    lineHeight: 1.45,
    color: "rgba(255,255,255,0.82)",
  }

  return (
    <div
      data-html-movements="true"
      style={{
        display: "flex",
        justifyContent: "flex-end",
        width: "100%",
      }}
    >
      <details
        style={{
          width: "100%",
          maxWidth: 660,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.04)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.22)",
          overflow: "hidden",
        }}
      >
        <summary
          style={{
            listStyle: "none",
            cursor: "pointer",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            fontSize: 13,
            fontWeight: 900,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            color: "white",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
            userSelect: "none",
          }}
        >
          <span>Mostra promo / retro</span>
          <span style={{ opacity: 0.72, fontSize: 11 }}>Tap / Click</span>
        </summary>

        <div
          style={{
            padding: 16,
            display: "grid",
            gap: 4,
          }}
        >
          {hasMovements ? (
            <>
              {promotions.length > 0 && (
                <div style={rowStyle}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      letterSpacing: 0.35,
                      textTransform: "uppercase",
                      color: "#22c55e",
                      paddingTop: 2,
                    }}
                  >
                    Promossi
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    {promotions.map((item, index) => (
                      <div key={`promo-${index}`} style={textStyle}>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {relegations.length > 0 && (
                <div style={rowStyle}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      letterSpacing: 0.35,
                      textTransform: "uppercase",
                      color: "#ef4444",
                      paddingTop: 2,
                    }}
                  >
                    Retrocessi
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    {relegations.map((item, index) => (
                      <div key={`retro-${index}`} style={textStyle}>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.45,
                color: "rgba(255,255,255,0.82)",
              }}
            >
              Nessuna promozione o retrocessione per questa lega.
            </div>
          )}

          <div
            style={{
              paddingTop: 10,
              fontSize: 11,
              lineHeight: 1.45,
              color: "rgba(255,255,255,0.70)",
            }}
          >
            Promo: 60% dei punti totalizzati nelle prime 3 gare. Retro: 150% dei
            punti totalizzati nelle prime 3 gare. Come da regolamento.
          </div>
        </div>
      </details>
    </div>
  )
}

function openBaselineModal() {
  const nextDraft = [...driverBaselines].sort((a, b) =>
    a.pilota.localeCompare(b.pilota, "it", { sensitivity: "base" })
  )
  setBaselineDraft(nextDraft)
  setShowBaselineModal(true)
}

function renderExactRaceResultBadge({
  position,
  status,
  pp,
  gv,
  exporting = false,
}: {
  position?: number | null
  status?: ChampionshipCellStatus | null
  pp?: boolean
  gv?: boolean
  exporting?: boolean
}) {
  return (
    <RaceResultChip
      position={position ?? null}
      status={status ?? null}
      pp={pp ?? false}
      gv={gv ?? false}
      exporting={exporting}
    />
  )
}

function applyBaselineDraft() {
  const cleaned = baselineDraft
    .map((entry) => ({
      pilota: String(entry.pilota || "").trim(),
      pointsAfterRace2: Number(entry.pointsAfterRace2) || 0,
      league: entry.league,
    }))
    .filter((entry) => entry.pilota)

  setDriverBaselines(cleaned)
  setShowBaselineModal(false)
}

function getDriverRatingKey(pilota: string) {
  return normalizeDriverNameForChampionship(pilota)
}

type DriverRatingPenalty = "Sospeso per 1 gara" | "Sospeso per 2 gare" | "Squalificato"
type DriverRatingValue = number | DriverRatingPenalty

function DriverRatingStars({
  value,
  exporting = false,
  onChange,
}: {
  value: DriverRatingValue
  exporting?: boolean
  onChange?: (v: DriverRatingValue) => void
}) {
  const isPenalty = typeof value === "string"
  const safeValue = isPenalty ? 0 : Math.max(0, Math.min(5, Number(value) || 0))
  const starSize = exporting ? 16 : 17
  const [hoverValue, setHoverValue] = React.useState<number | null>(null)
  const displayValue = exporting ? safeValue : (hoverValue ?? safeValue)

  if (isPenalty) {
  return (
    <span
      onClick={() => {
        if (!exporting && onChange) onChange(5)
      }}
      title={exporting ? undefined : "Clicca per ripristinare 5 stelle"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: exporting ? "5px 10px" : "4px 9px",
        borderRadius: 999,
        background: "rgba(239,68,68,0.92)",
        border: "1px solid rgba(239,68,68,0.65)",
        boxShadow: "0 0 16px rgba(239,68,68,0.28)",
        color: "#fff",
        fontSize: exporting ? 11 : 10,
        fontWeight: 900,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        cursor: exporting ? "default" : "pointer",
      }}
    >
      {value}
    </span>
  )
}

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 3,
        minWidth: 96,
      }}
      onMouseLeave={() => {
        if (!exporting) setHoverValue(null)
      }}
    >
      {Array.from({ length: 5 }).map((_, index) => {
        const starIndex = index + 1
        const filled = starIndex <= displayValue

        return (
          <span
            key={index}
            onMouseEnter={() => {
              if (!exporting) setHoverValue(starIndex)
            }}
            onClick={() => {
              if (!exporting && onChange) {
                if (starIndex === 1 && safeValue === 1) {
                  const scelta = window.prompt(
                    "Provvedimento rating:\n1 = Sospeso per 1 gara\n2 = Sospeso per 2 gare\n3 = Squalificato"
                  )

                  if (scelta === "1") onChange("Sospeso per 1 gara")
                  if (scelta === "2") onChange("Sospeso per 2 gare")
                  if (scelta === "3") onChange("Squalificato")
                  return
                }

                onChange(starIndex)
              }
            }}
            title={
              exporting
                ? undefined
                : starIndex === 1 && safeValue === 1
                  ? "Clicca per togliere anche l'ultima stella"
                  : `${starIndex} stelle`
            }
            style={{
              fontSize: starSize,
              lineHeight: 1,
              fontWeight: 900,
              cursor: exporting ? "default" : "pointer",
              userSelect: "none",
              color: filled ? "#facc15" : "transparent",
              WebkitTextStroke: filled
                ? "0px transparent"
                : "1px rgba(255,255,255,0.12)",
              opacity: filled ? 1 : 0.25,
              textShadow: filled
                ? "0 0 6px rgba(250,204,21,0.65), 0 0 14px rgba(250,204,21,0.40)"
                : "none",
              transform:
                !exporting && hoverValue === starIndex
                  ? "scale(1.15)"
                  : "scale(1)",
              transition: "all 0.15s ease",
              display: "inline-block",
            }}
          >
            ★
          </span>
        )
      })}
    </div>
  )
}

function ChampionshipTableBlock({
  selectedLeague,
  currentRace,
  championshipRacesIncludedLabel,
  driverChampionshipByLeague,
  manualRace12Draft,
  driverRatingMap = {},
  setDriverRatingMap,
  exporting = false,
  editingRaceCell,
  setEditingRaceCell,
  setManualRace12Draft,
}: {
  selectedLeague: ChampionshipLeagueKey
  currentRace: number
  championshipRacesIncludedLabel: string
  driverChampionshipByLeague: Record<ChampionshipLeagueKey, DriverChampionshipRow[]>
  manualRace12Draft: Record<string, { g1: string; g2: string }>
  driverRatingMap?: Record<string, DriverRatingValue>
setDriverRatingMap?: React.Dispatch<React.SetStateAction<Record<string, DriverRatingValue>>>
  exporting?: boolean
  editingRaceCell?: { driverKey: string; race: 1 | 2 } | null
  setEditingRaceCell?: React.Dispatch<
    React.SetStateAction<{ driverKey: string; race: 1 | 2 } | null>
  >
  setManualRace12Draft?: React.Dispatch<
    React.SetStateAction<Record<string, { g1: string; g2: string }>>
  >
}) {
  const leagueRows = driverChampionshipByLeague[selectedLeague] || []

  if (leagueRows.length === 0) return null

  const s = PRT_CHAMPIONSHIP_TABLE_STYLES

  const championshipCircuits: Record<
    number,
    { name: string; flagSrc: string; isLogo?: boolean }
  > = {
    1: { name: "Lago Maggiore", flagSrc: "/flags/it.png" },
    2: { name: "Blue Moon Bay", flagSrc: "/flags/us.png" },
    3: { name: "Barcelona", flagSrc: "/flags/es.png" },
    4: { name: "Le Mans", flagSrc: "/flags/fr.png" },
    5: { name: "Alsace", flagSrc: "/flags/fr.png" },
    6: { name: "Sardegna B", flagSrc: "/flags/it.png" },
    7: { name: "Monza", flagSrc: "/flags/it.png" },
    8: { name: "Gilles Villeneuve", flagSrc: "/flags/ca.png" },
    9: { name: "Saint Croix", flagSrc: "/flags/fr.png" },
    10: { name: "Dragon Trail", flagSrc: "/flags/hr.png" },
    11: { name: "Yas Marina", flagSrc: "/flags/ae.png" },
    12: { name: "Watkins Glen", flagSrc: "/flags/us.png" },
    13: { name: "?", flagSrc: "/flags/13.png" },
  }

  function renderRaceHeaderCell(raceNumber: number) {
    const circuit = championshipCircuits[raceNumber]

    return (
      <div
        style={{
          display: "grid",
          justifyItems: "center",
          alignItems: "start",
          gap: exporting ? 7 : 3,
          lineHeight: 1,
          width: "100%",
        }}
      >
        <div
          style={{
            width: exporting ? 62 : "auto",
            textAlign: "center",
            fontWeight: 900,
            fontSize: exporting ? 12 : 11,
            letterSpacing: 0.2,
            whiteSpace: "nowrap",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {exporting ? `Gara ${raceNumber}` : `G${raceNumber}`}
        </div>

        <img
          src={circuit?.flagSrc || "/flags/it.png"}
          alt={circuit?.name || `G${raceNumber}`}
          style={{
            width: exporting ? 38 : 16,
            height: exporting ? 22 : 10,
            objectFit: "cover",
            borderRadius: 2,
            border: "none",
            display: "block",
            transform: exporting ? "scale(1.25)" : "none",
          }}
        />
      </div>
    )
  }

  function updateManualRaceValue(
    driverKey: string,
    race: 1 | 2,
    value: string
  ) {
    if (!setManualRace12Draft) return

    setManualRace12Draft((prev) => {
      const current = prev[driverKey] || { g1: "", g2: "" }
      const nextValue = value.trim()

      const nextEntry =
        race === 1
          ? { ...current, g1: nextValue }
          : { ...current, g2: nextValue }

      const isEmpty = !nextEntry.g1.trim() && !nextEntry.g2.trim()

      if (isEmpty) {
        const next = { ...prev }
        delete next[driverKey]
        return next
      }

      return {
        ...prev,
        [driverKey]: nextEntry,
      }
    })
  }

  function renderManualEditableCell(driver: DriverChampionshipRow, race: 1 | 2) {
    const key = normalizeDriverNameForChampionship(driver.pilota)
    const rawValue = manualRace12Draft[key]?.[race === 1 ? "g1" : "g2"] ?? ""
    const parsed = parseManualChampionshipCell(rawValue)
    const isEditing =
      !exporting &&
      !!editingRaceCell &&
      editingRaceCell.driverKey === key &&
      editingRaceCell.race === race

    if (exporting || !setEditingRaceCell || !setManualRace12Draft) {
      return (
        <span
          style={{
            ...(exporting ? s.raceCellInnerExport : s.raceCellInner),
            fontWeight: exporting ? 700 : 600,
          }}
        >
          {renderChampionshipRaceCell(parsed, exporting)}
        </span>
      )
    }

    if (isEditing) {
      return (
        <input
          autoFocus
          defaultValue={rawValue}
          placeholder="Es. 5 / 5 pp / dnf / dnf-i / dnfv / dnp / box / dsq"
          onBlur={(e) => {
            updateManualRaceValue(key, race, e.target.value)
            setEditingRaceCell(null)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateManualRaceValue(key, race, (e.target as HTMLInputElement).value)
              setEditingRaceCell(null)
            }

            if (e.key === "Escape") {
              setEditingRaceCell(null)
            }
          }}
          style={{
            width: 58,
            height: exporting ? 30 : 28,
            padding: "0 8px",
            borderRadius: 10,
            border: "1px solid rgba(160,90,255,0.35)",
            background: "rgba(0,0,0,0.30)",
            color: "white",
            textAlign: "center",
            fontSize: 12,
            fontWeight: 700,
            outline: "none",
            boxShadow: "0 0 16px rgba(160,90,255,0.16)",
          }}
        />
      )
    }

    return (
      <button
        onClick={() => setEditingRaceCell({ driverKey: key, race })}
        title={`Modifica G${race}`}
        style={{
          border: "none",
          background: "transparent",
          padding: 0,
          margin: 0,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 58,
          minHeight: exporting ? 30 : 28,
        }}
      >
        <span
          style={{
            ...(exporting ? s.raceCellInnerExport : s.raceCellInner),
            fontWeight: exporting ? 700 : 600,
          }}
        >
          {renderChampionshipRaceCell(parsed, exporting)}
        </span>
      </button>
    )
  }

  return (
    <div style={exporting ? s.wrapperExport : s.wrapper}>
      <div
        ref={championshipExportBannerRef}
        style={{
          ...s.headRow,
          ...(exporting ? s.headRowExport : {}),
        }}
      >
        <div
          style={{
            ...s.headTitleWrap,
            ...(exporting ? s.headTitleWrapExport : {}),
          }}
        >
          <div
            style={{
              ...s.headTitle,
              ...(exporting ? s.headTitleExport : {}),
            }}
          >
            Classifica Generale Piloti
          </div>

          {isMovementRound(currentRace) && !exporting ? (
            <div
              style={{
                fontSize: 12,
                opacity: 0.76,
                lineHeight: 1.4,
                color: "rgba(255,255,255,0.82)",
              }}
            >
              Nei round di snodo la classifica generale riflette subito la lega aggiornata del cassetto piloti.
            </div>
          ) : null}
        </div>

        <div
          style={{
            ...s.headMeta,
            ...(exporting ? s.headMetaExport : {}),
          }}
        >
          Lega {selectedLeague} • {leagueRows.length} piloti
        </div>
      </div>

      <div
        ref={exporting ? championshipExportTableRef : undefined}
        style={{
          ...s.tableWrap,
          ...(exporting ? s.tableWrapExport : {}),
        }}
      >
        <table
          style={{
            ...(exporting ? s.tableExport : s.table),
          }}
        >
          <thead
            style={{
              ...(exporting ? s.theadExport : s.thead),
            }}
          >
            <tr>
              <th
                style={{
                  ...(exporting ? s.thBaseExport : s.thBase),
                  textAlign: "center",
                  ...s.col.pos,
                }}
              >
                Pos
              </th>

              <th
                style={{
                  ...(exporting ? s.thBaseExport : s.thBase),
                  textAlign: "left",
                  ...s.col.pilota,
                }}
              >
                Pilota
              </th>

              <th
                style={{
                  ...(exporting ? s.thBaseExport : s.thBase),
                  textAlign: "center",
                  ...s.col.rating,
                }}
              >
                Rating
              </th>

              <th
                style={{
                  ...(exporting ? s.thBaseExport : s.thBase),
                  ...s.col.totale,
                }}
              >
                Punti
              </th>

              <th
                style={{
                  ...(exporting ? s.thBaseExport : s.thBase),
                  ...s.col.gara,
                  paddingTop: exporting ? 10 : 8,
                  paddingBottom: exporting ? 10 : 8,
                }}
              >
                {renderRaceHeaderCell(1)}
              </th>

              <th
                style={{
                  ...(exporting ? s.thBaseExport : s.thBase),
                  ...s.col.gara,
                  paddingTop: exporting ? 10 : 8,
                  paddingBottom: exporting ? 10 : 8,
                }}
              >
                {renderRaceHeaderCell(2)}
              </th>

              {Array.from({ length: 11 }).map((_, i) => {
                const raceNumber = i + 3
                return (
                  <th
                    key={`head-g-${raceNumber}`}
                    style={{
                      ...(exporting ? s.thBaseExport : s.thBase),
                      ...s.col.gara,
                      paddingTop: exporting ? 10 : 8,
                      paddingBottom: exporting ? 10 : 8,
                    }}
                  >
                    {renderRaceHeaderCell(raceNumber)}
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody
            style={{
              ...(exporting ? s.tbodyExport : s.tbody),
            }}
          >
            {leagueRows.map((driver, index) => {
              const ratingKey = getDriverRatingKey(driver.pilota)
              const currentRating = driverRatingMap[ratingKey] ?? 5

              return (
                <tr
                  key={`${driver.pilota}-${index}`}
                  style={{
                    ...(index % 2 === 0
                      ? exporting
                        ? s.rowEvenExport
                        : s.rowEven
                      : exporting
                        ? s.rowOddExport
                        : s.rowOdd),

                    ...(index === 0
                      ? {
                          background:
                            "linear-gradient(90deg, rgba(255,215,0,0.10), rgba(0,0,0,0.25))",
                          boxShadow: "inset 0 0 18px rgba(255,215,0,0.10)",
                        }
                      : index === 1
                        ? {
                            background:
                              "linear-gradient(90deg, rgba(220,220,220,0.08), rgba(0,0,0,0.25))",
                            boxShadow: "inset 0 0 14px rgba(220,220,220,0.08)",
                          }
                        : index === 2
                          ? {
                              background:
                                "linear-gradient(90deg, rgba(205,127,50,0.08), rgba(0,0,0,0.25))",
                              boxShadow: "inset 0 0 14px rgba(205,127,50,0.08)",
                            }
                          : {}),
                  }}
                >
                  <TableCell
                    align="center"
                    style={{
                      ...s.col.pos,
                      ...(exporting ? s.posCellExport : s.posCell),
                      textAlign: "center",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <PosBadge pos={index + 1} />
                    </div>
                  </TableCell>

                  <TableCell
                    align="left"
                    style={{
                      ...s.col.pilota,
                      ...(exporting ? s.pilotCellExport : s.pilotCell),
                      fontWeight: exporting ? 700 : 600,

                      ...(index === 0
                        ? { textShadow: "0 0 10px rgba(255,215,0,0.35)" }
                        : index === 1
                          ? { textShadow: "0 0 8px rgba(220,220,220,0.30)" }
                          : index === 2
                            ? { textShadow: "0 0 8px rgba(205,127,50,0.30)" }
                            : {}),
                    }}
                  >
                    {driver.pilota}
                  </TableCell>

                  <TableCell
                    align="center"
                    style={{
                      ...s.col.rating,
                      ...(exporting ? s.ratingCellExport : s.ratingCell),
                    }}
                  >
                    <DriverRatingStars
                      value={currentRating}
                      exporting={exporting}
                      onChange={(v) => {
                        if (!setDriverRatingMap) return
                        setDriverRatingMap((prev) => ({
                          ...prev,
                          [ratingKey]: typeof v === "number" ? Math.max(1, Math.min(5, v)) : v,
                        }))
                      }}
                    />
                  </TableCell>

                  <TableCell
                    align="center"
                    style={{
  ...s.col.totale,
  ...(exporting ? s.totalCellExport : s.totalCell),
  fontWeight: exporting ? 800 : 700,
  fontSize: exporting ? 16 : 16,
  position: "relative",
}}
                  >
                    {driver.totalPoints}
                    <div
  style={{
    position: "absolute",
    top: "-6%",
    right: 0,
    width: 2,
    height: "112%",
    borderRadius: 2,
    background:
      "linear-gradient(180deg, rgba(255,215,0,0), rgba(255,215,0,0.9), rgba(255,215,0,0))",
    boxShadow:
      "0 0 10px rgba(255,215,0,0.6), 0 0 18px rgba(255,215,0,0.3)",
    pointerEvents: "none",
  }}
/>
                  </TableCell>

                  <TableCell
                    align="center"
                    style={{
                      ...(exporting ? s.garaCellExport : s.garaCell),
                    }}
                  >
                    {renderManualEditableCell(driver, 1)}
                  </TableCell>

                  <TableCell
                    align="center"
                    style={{
                      ...(exporting ? s.garaCellExport : s.garaCell),
                    }}
                  >
                    {renderManualEditableCell(driver, 2)}
                  </TableCell>

                  {Array.from({ length: 11 }).map((_, i) => {
                    const raceNumber = i + 3
                    const cell = driver.raceResults[raceNumber] ?? null

                    return (
                      <TableCell
                        key={`r-${raceNumber}-${index}`}
                        align="center"
                        style={{
                          ...(exporting ? s.garaCellExport : s.garaCell),
                        }}
                      >
                        {raceNumber <= currentRace ? (
                          <span
                            style={{
                              ...(exporting ? s.raceCellInnerExport : s.raceCellInner),
                              fontWeight: exporting ? 700 : 600,
                            }}
                          >
                            {renderChampionshipRaceCell(cell, exporting)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function resetBaselineDraft() {
  setBaselineDraft([])
  setDriverBaselines([])
  setShowBaselineModal(false)
}

  const previewRows = useMemo<DisplayRow[]>(() => {
    const csvRows = parseCsvRows(csv)

    if (csvRows.length === 0) {
      return rows.map((r) => ({
        ...r,
        sourcePosGara: r.posGara,
      }))
    }

    const byPilot = new Map<string, ExtractRow>()
    const byPos = new Map<number, ExtractRow>()

    for (const r of csvRows) {
      byPilot.set(normalizePilot(r.pilota), r)
      byPos.set(r.posGara, r)
    }

    if (rows.length === 0) {
      return csvRows.map((r) => ({
        ...r,
        sourcePosGara: r.posGara,
      }))
    }

    return rows.map((r) => {
      const fromPilot = byPilot.get(normalizePilot(r.pilota))
      const fromPos = byPos.get(r.posGara)
      const merged = fromPilot || fromPos

      if (!merged) {
        return {
          ...r,
          sourcePosGara: r.posGara,
        }
      }

      return {
        ...r,
        sourcePosGara: r.posGara,
        posGara: merged.posGara || r.posGara,
        pilota: merged.pilota || r.pilota,
        auto: merged.auto || r.auto,
        tempoTotaleGara: merged.tempoTotaleGara || r.tempoTotaleGara,
        distaccoDalPrimo: merged.distaccoDalPrimo || r.distaccoDalPrimo,
        migliorGiroGara: merged.migliorGiroGara || r.migliorGiroGara,
        tempoQualifica: merged.tempoQualifica || r.tempoQualifica,
        pole: merged.pole || r.pole,
      }
    })
  }, [rows, csv])

  const hasExtractedRaceData = useMemo(() => {
  return previewRows.length > 0
}, [previewRows])

  const leagueDriverResolution = useMemo(() => {
  const officialLeaguePilots = (workbenchDriverLeagueMap[selectedLeague] || [])
    .map((name) => String(name || "").trim())
    .filter(Boolean)

  const aliasMapForLeague = driverAliasMap[selectedLeague] || {}

  const unresolvedMap = new Map<string, UnresolvedDriverCandidate>()

  const baseRows = previewRows.map((r) => {
    const originalPilot = String(r.pilota ?? "").trim()
    const manualPilot = manualPilotOverrides[r.sourcePosGara]
    const hasManualPilot = manualPilot !== undefined

    let resolvedPilot = String(manualPilot ?? originalPilot).trim()

    if (!hasManualPilot && resolvedPilot) {
      const normalizedRaw = normalizeDriverLookupName(resolvedPilot)

      const aliasResolvedOfficial = aliasMapForLeague[normalizedRaw]
      if (aliasResolvedOfficial) {
        resolvedPilot = aliasResolvedOfficial
      } else {
        const exactOfficial = officialLeaguePilots.find(
          (pilot) => normalizeDriverLookupName(pilot) === normalizedRaw
        )

        if (exactOfficial) {
          resolvedPilot = exactOfficial
        } else {
          const bestMatch = findBestOfficialPilotMatch(resolvedPilot, officialLeaguePilots)

          if (bestMatch?.isSafeAutoMatch && bestMatch.score >= 0.96) {
  resolvedPilot = bestMatch.officialName
} else if (normalizedRaw) {
            const unresolvedId = `${selectedLeague}:${normalizedRaw}`

            if (!dismissedUnknownDrivers[unresolvedId] && !unresolvedMap.has(unresolvedId)) {
              unresolvedMap.set(unresolvedId, {
                id: unresolvedId,
                rawName: resolvedPilot,
                normalizedRawName: normalizedRaw,
                league: selectedLeague,
                suggestedOfficialName: bestMatch?.officialName || "",
                suggestedScore: bestMatch?.score || 0,
              })
            }
          }
        }
      }
    }

    const manualDistaccoValue = (manualDistaccoOverrides[r.sourcePosGara] ?? "").trim()

return {
  ...r,
  pilota: resolvedPilot,
  auto: (manualAutoOverrides[r.sourcePosGara] ?? r.auto ?? "").trim(),

  tempoTotaleGara:
    isSpecialGara7Platinum && r.posGara === 1 && manualDistaccoValue
      ? manualDistaccoValue
      : r.tempoTotaleGara,

  distaccoDalPrimo: (manualDistaccoValue || r.distaccoDalPrimo || "").trim(),

  migliorGiroGara: isSpecialGara7Platinum ? "" : r.migliorGiroGara,

  tempoQualifica: (() => {
  const value = (
    showQualiModal
      ? (manualQualiDraft[r.sourcePosGara] ?? manualQualiOverrides[r.sourcePosGara] ?? r.tempoQualifica ?? "")
      : (manualQualiOverrides[r.sourcePosGara] ?? r.tempoQualifica ?? "")
  ).trim()

  return value === "-" ? "" : value
})(),
    }
  })

    for (const q of qualiRows) {
    const qualiName = String(q.pilota || "").trim()
    if (!qualiName) continue

    const normalizedRaw = normalizeDriverLookupName(qualiName)
    if (!normalizedRaw) continue

    const alreadyOfficial = officialLeaguePilots.some(
      (pilot) => normalizeDriverLookupName(pilot) === normalizedRaw
    )

    const alreadyAlias = !!aliasMapForLeague[normalizedRaw]

    const alreadyInRaceAsOfficialOrAlias = baseRows.some((row) => {
  const rowKey = normalizeDriverLookupName(row.pilota)

  return (
    rowKey === normalizedRaw &&
    (
      officialLeaguePilots.some(
        (pilot) => normalizeDriverLookupName(pilot) === rowKey
      ) ||
      !!aliasMapForLeague[rowKey]
    )
  )
})

    const hasTime = String(q.tempo || "").trim().length > 0

    if (
      hasTime &&
      !alreadyOfficial &&
      !alreadyAlias &&
      !alreadyInRaceAsOfficialOrAlias
    ) {
      const bestMatch = findBestOfficialPilotMatch(qualiName, officialLeaguePilots)
      const unresolvedId = `${selectedLeague}:${normalizedRaw}`

      if (!dismissedUnknownDrivers[unresolvedId] && !unresolvedMap.has(unresolvedId)) {
        unresolvedMap.set(unresolvedId, {
          id: unresolvedId,
          rawName: qualiName,
          normalizedRawName: normalizedRaw,
          league: selectedLeague,
          suggestedOfficialName: bestMatch?.officialName || "",
          suggestedScore: bestMatch?.score || 0,
        })
      }
    }
  }

  return {
    baseRows,
    unresolvedCandidates: Array.from(unresolvedMap.values()),
  }
}, [
  previewRows,
  qualiRows,
  manualPilotOverrides,
  manualAutoOverrides,
  manualDistaccoOverrides,
  manualQualiOverrides,
  manualQualiDraft,
  showQualiModal,
  workbenchDriverLeagueMap,
  driverAliasMap,
  selectedLeague,
  dismissedUnknownDrivers,
  isSpecialGara7Platinum,
])

const unresolvedLeagueDrivers = leagueDriverResolution.unresolvedCandidates
const activeUnknownDriver = unresolvedLeagueDrivers[0] || null

const displayRows = useMemo<DisplayRow[]>(() => {
  if (leagueDriverResolution.baseRows.length === 0) return []

  const baseRows = leagueDriverResolution.baseRows

  let bestQualiMs: number | null = null
  let bestSourcePos: number | null = null

  for (const row of baseRows) {
    const ms = parseMmSsMmm((row.tempoQualifica || "").trim())
    if (ms == null) continue

    if (bestQualiMs == null || ms < bestQualiMs) {
      bestQualiMs = ms
      bestSourcePos = row.sourcePosGara
    }
  }

  const rowsWithPole = baseRows.map((row) => ({
    ...row,
    pole: bestSourcePos != null && row.sourcePosGara === bestSourcePos ? "POLE" : "",
  }))

  const officialLeaguePilots = (workbenchDriverLeagueMap[selectedLeague] || [])
  .map((name) => String(name || "").trim())
  .filter(Boolean)

const presentPilotKeys = new Set(
  rowsWithPole.map((row) => normalizeDriverNameForChampionship(row.pilota))
)

  const maxSourcePos = rowsWithPole.reduce(
    (max, row) => Math.max(max, Number(row.sourcePosGara) || 0),
    0
  )

  const missingDnpRows: DisplayRow[] = officialLeaguePilots
    .filter((pilot) => !presentPilotKeys.has(normalizeDriverNameForChampionship(pilot)))
    .map((pilot, index) => ({
      posGara: rowsWithPole.length + index + 1,
      sourcePosGara: maxSourcePos + index + 1,
      pilota: pilot,
      auto: "---",
      tempoTotaleGara: "DNP",
      distaccoDalPrimo: "DNP",
      migliorGiroGara: "",
      tempoQualifica: "",
      pole: "",
    }))

  return [...rowsWithPole, ...missingDnpRows]
}, [leagueDriverResolution.baseRows, workbenchDriverLeagueMap, selectedLeague])
    const hasManualPilotOverrides = useMemo(() => {
    return Object.keys(manualPilotOverrides).length > 0
  }, [manualPilotOverrides])

  const hasManualDistaccoOverrides = useMemo(() => {
    return Object.keys(manualDistaccoOverrides).length > 0
  }, [manualDistaccoOverrides])

  const shouldSyncDgTableWithManualEdits = useMemo(() => {
    return hasManualPilotOverrides || hasManualDistaccoOverrides
  }, [hasManualPilotOverrides, hasManualDistaccoOverrides])

  const bestQuali = useMemo(() => {
    const poleRow = displayRows.find((r) => (r.pole || "").trim().toUpperCase() === "POLE")
    if (poleRow) {
      return `${poleRow.pilota || "?"}  ${poleRow.tempoQualifica || "NO TIME"}`
    }

    let bestMs: number | null = null
    let bestTime = ""
    let bestPilot = ""

    for (const r of displayRows) {
      const t = (r.tempoQualifica || "").trim()
      const ms = parseMmSsMmm(t)
      if (ms == null) continue
      if (bestMs == null || ms < bestMs) {
        bestMs = ms
        bestTime = t
        bestPilot = r.pilota || ""
      }
    }

    return bestTime ? `${bestPilot || "?"}  ${bestTime}` : ""
  }, [displayRows])

  const bestRaceLap = useMemo(() => {
      if (isSpecialGara7Platinum) return "NO TIME"
    let bestMs: number | null = null
    let bestTime = ""
    let bestPilot = ""

    for (const r of displayRows) {
      const t = (r.migliorGiroGara || "").trim()
      const ms = parseMmSsMmm(t)
      if (ms == null) continue
      if (bestMs == null || ms < bestMs) {
        bestMs = ms
        bestTime = t
        bestPilot = r.pilota || ""
      }
    }

    return bestTime ? `${bestPilot || "?"}  ${bestTime}` : ""
  }, [displayRows, isSpecialGara7Platinum])

    

    const finalRows = useMemo<DisplayRow[]>(() => {
    if (displayRows.length === 0) return []

    const useEditedOrderingForDg = shouldSyncDgTableWithManualEdits

    const detectedLeaderRow =
      displayRows.find((r) => parseAbsoluteRaceTimeMs(r.tempoTotaleGara) != null) ||
      displayRows.find((r) => r.posGara === 1) ||
      displayRows[0]

    const detectedLeaderMs = detectedLeaderRow
      ? parseAbsoluteRaceTimeMs(detectedLeaderRow.tempoTotaleGara)
      : null

    const orderedRows = useEditedOrderingForDg
      ? [...displayRows].sort((a, b) => {
          const aTempo = tempoLikeGt7(a)
          const bTempo = tempoLikeGt7(b)

          const aIsNonComparable = isNonComparableRaceValue(aTempo)
          const bIsNonComparable = isNonComparableRaceValue(bTempo)

          let aMs: number | null = null
          let bMs: number | null = null

          if (!aIsNonComparable && detectedLeaderMs != null) {
            aMs =
              parseAbsoluteRaceTimeMs(a.tempoTotaleGara) ??
              (a.posGara === 1
                ? parseAbsoluteRaceTimeMs(a.tempoTotaleGara)
                : (() => {
                    const gap = parseGapToMs(a.distaccoDalPrimo)
                    return gap != null ? detectedLeaderMs + gap : null
                  })())
          }

          if (!bIsNonComparable && detectedLeaderMs != null) {
            bMs =
              parseAbsoluteRaceTimeMs(b.tempoTotaleGara) ??
              (b.posGara === 1
                ? parseAbsoluteRaceTimeMs(b.tempoTotaleGara)
                : (() => {
                    const gap = parseGapToMs(b.distaccoDalPrimo)
                    return gap != null ? detectedLeaderMs + gap : null
                  })())
          }

          if (aMs != null && bMs != null) {
            if (aMs !== bMs) return aMs - bMs
            return a.posGara - b.posGara
          }

          if (aMs != null && bMs == null) return -1
          if (aMs == null && bMs != null) return 1

          return a.posGara - b.posGara
        })
      : [...displayRows].sort((a, b) => a.posGara - b.posGara)

    const leaderRow = orderedRows.find((r) => r.posGara === 1) || orderedRows[0]
    const leaderMs = leaderRow ? parseAbsoluteRaceTimeMs(leaderRow.tempoTotaleGara) : null

    if (leaderMs == null) {
  return orderedRows.map((r, i) => {
    const key = getPrtRowStableKey(r.sourcePosGara)
    const rawTempo = tempoLikeGt7(r)
    const upperTempo = rawTempo.trim().toUpperCase()
    const isBaseDnf = upperTempo === "DNF" || upperTempo === "DNF-I"
    const dnfValue = isBaseDnf ? dnfOverrides[key] || (upperTempo === "DNF-I" ? "DNF-I" : "DNF") : null
        const rowHasDsqPenalty = hasDsqPenalty(penalties[key] || [], currentRace)

        if (rowHasDsqPenalty) {
          return {
            ...r,
            posGara: i + 1,
            tempoTotaleGara: "DSQ",
            distaccoDalPrimo: "DSQ",
          }
        }

        if (dnfValue) {
          return {
            ...r,
            posGara: i + 1,
            tempoTotaleGara: dnfValue,
            distaccoDalPrimo: dnfValue,
          }
        }

        return { ...r, posGara: i + 1 }
      })
    }

    const comparable: Array<{
      orderedIndex: number
      row: DisplayRow
      penalizedMs: number
    }> = []

    const nonComparable: Array<{
      orderedIndex: number
      row: DisplayRow
    }> = []

    const dsqRows: Array<{
      orderedIndex: number
      row: DisplayRow
    }> = []

    const resolvedBaseMsByOrderedIndex = new Map<number, number>()

    for (let i = 0; i < orderedRows.length; i++) {
      const row = orderedRows[i]
      const key = getPrtRowStableKey(row.sourcePosGara)
      const rawTempo = tempoLikeGt7(row)
      const isDoppiato = isDoppiatoValue(rawTempo)
      const manualGap = (lapOverrides[key] || "").trim()

      let baseMs: number | null = null

      if (isDoppiato && manualGap) {
        const manualGapMs = parseManualLeaderGapInputMs(manualGap)
        const prevIndex = i - 1

        if (
          manualGapMs != null &&
          prevIndex >= 0 &&
          resolvedBaseMsByOrderedIndex.has(prevIndex)
        ) {
          const prevMs = resolvedBaseMsByOrderedIndex.get(prevIndex)!
          baseMs = prevMs + manualGapMs
        }
      } else {
        baseMs = resolveComparableRaceMs(row, leaderMs)
      }

      if (baseMs != null) {
        resolvedBaseMsByOrderedIndex.set(i, baseMs)
      }
    }

    for (let i = 0; i < orderedRows.length; i++) {
      const row = orderedRows[i]
      const key = getPrtRowStableKey(row.sourcePosGara)
      const rowHasDsqPenalty = hasDsqPenalty(penalties[key] || [], currentRace)
      const isDsq =
        (row.tempoTotaleGara || "").trim().toUpperCase() === "DSQ" || rowHasDsqPenalty

      if (isDsq) {
        dsqRows.push({ orderedIndex: i, row })
        continue
      }

      const baseMs = resolvedBaseMsByOrderedIndex.get(i)
      if (baseMs == null) {
        nonComparable.push({ orderedIndex: i, row })
        continue
      }

      const penaltySec = totalPenaltySeconds(penalties[key] || [], currentRace)

      comparable.push({
        orderedIndex: i,
        row,
        penalizedMs: baseMs + penaltySec * 1000,
      })
    }

    comparable.sort((a, b) => {
      if (a.penalizedMs !== b.penalizedMs) return a.penalizedMs - b.penalizedMs
      return a.orderedIndex - b.orderedIndex
    })

    const newLeader = comparable[0]?.penalizedMs ?? leaderMs

    const updatedComparable = comparable.map((item, idx) => {
      const isLeader = idx === 0
      return {
        ...item.row,
        posGara: idx + 1,
        tempoTotaleGara: formatAbsoluteRaceTime(item.penalizedMs),
        distaccoDalPrimo: isLeader ? "-" : formatGapFromLeader(item.penalizedMs - newLeader),
      }
    })

    const updatedNonComparable = nonComparable
  .sort((a, b) => a.orderedIndex - b.orderedIndex)
  .map((item, idx) => {
    const key = getPrtRowStableKey(item.row.sourcePosGara)
    const rawTempo = tempoLikeGt7(item.row)
    const upperTempo = rawTempo.trim().toUpperCase()
    const isBaseDnf = upperTempo === "DNF" || upperTempo === "DNF-I"
    const dnfValue = isBaseDnf ? dnfOverrides[key] || (upperTempo === "DNF-I" ? "DNF-I" : "DNF") : null

        if (dnfValue) {
          return {
            ...item.row,
            posGara: updatedComparable.length + idx + 1,
            tempoTotaleGara: dnfValue,
            distaccoDalPrimo: dnfValue,
          }
        }

        return {
          ...item.row,
          posGara: updatedComparable.length + idx + 1,
        }
      })

    const updatedDsq = dsqRows
      .sort((a, b) => a.orderedIndex - b.orderedIndex)
      .map((item, idx) => ({
        ...item.row,
        posGara: updatedComparable.length + updatedNonComparable.length + idx + 1,
        tempoTotaleGara: "DSQ",
        distaccoDalPrimo: "DSQ",
      }))

    return [...updatedComparable, ...updatedNonComparable, ...updatedDsq]
  }, [displayRows, penalties, lapOverrides, dnfOverrides, shouldSyncDgTableWithManualEdits])

  const matchSummary = useMemo<PrtMatchSummary>(() => {
  if (finalRows.length === 0) {
    return {
      overallStatus: "warn",
      percentage: 0,
      fields: {
        posizione: "warn",
        pilota: "warn",
        auto: "warn",
        distacchi: "warn",
        pp: "warn",
        gv: "warn",
        gara: "warn",
        lobby: "warn",
        lega: "warn",
      },
      notes: ["Nessun dato da verificare."],
    }
  }

  const notes: string[] = []

  let posizione: MatchFieldStatus = "ok"
  let pilota: MatchFieldStatus = "ok"
  let auto: MatchFieldStatus = "ok"
  let distacchi: MatchFieldStatus = "ok"
  let pp: MatchFieldStatus = "ok"
  let gv: MatchFieldStatus = "ok"
  let gara: MatchFieldStatus = "ok"
  let lobby: MatchFieldStatus = "ok"
  let lega: MatchFieldStatus = "ok"

  // ---------------- POSIZIONI ----------------
  const positions = finalRows.map((r) => r.posGara)
  const isSequential = positions.every((p, i) => p === i + 1)

  if (!isSequential) {
    posizione = "error"
    notes.push("Ordine posizioni non consecutivo.")
  }

  // ---------------- PILOTI ----------------
  const names = finalRows.map((r) => (r.pilota || "").trim().toLowerCase())
  const hasEmptyName = names.some((n) => !n)
  const hasDuplicates = new Set(names).size !== names.length

  if (hasEmptyName) {
    pilota = "error"
    notes.push("Presente almeno un pilota vuoto.")
  } else if (hasDuplicates) {
    pilota = "warn"
    notes.push("Possibili piloti duplicati.")
  }

  // ---------------- AUTO ----------------
  const autos = finalRows.map((r) => (r.auto || "").trim())
  const hasEmptyAuto = autos.some((a) => !a)
  const suspiciousAuto = autos.some((a) => a.length < 3)

  if (hasEmptyAuto) {
    auto = "error"
    notes.push("Presente almeno un'auto vuota.")
  } else if (suspiciousAuto) {
    auto = "warn"
    notes.push("Possibile auto anomala.")
  }

  // ---------------- DISTACCHI ----------------
  const validDistacco = finalRows.every((r, i) => {
    if (i === 0) return true
    const d = (r.distaccoDalPrimo || "").trim()

        return (
      /^\+\d{1,2}:\d{2}\.\d{3}$/.test(d) ||
      /^\+\d{1,2}\.\d{3}$/.test(d) ||
      /^DNF$/i.test(d) ||
      /^DNFV$/i.test(d) ||
      /^DNP$/i.test(d) ||
      /^DSQ$/i.test(d) ||
      /^DOPPIATO$/i.test(d) ||
      /^\d+giro$/i.test(d)
    )
  })

  if (!validDistacco) {
    distacchi = "warn"
    notes.push("Almeno un distacco non standard.")
  }

  // ---------------- PP / GV ----------------
  const poleRows = finalRows.filter((r) => (r.pole || "").trim().toUpperCase() === "POLE")

  if (poleRows.length > 1) {
    pp = "error"
    notes.push("Più di una PP rilevata.")
  } else if (poleRows.length === 0) {
    pp = "warn"
    notes.push("PP non rilevata.")
  }

  let bestLapRowsCount = 0
  let bestLapMs: number | null = null

  for (const r of finalRows) {
    const ms = parseMmSsMmm((r.migliorGiroGara || "").trim())
    if (ms == null) continue

    if (bestLapMs == null || ms < bestLapMs) {
      bestLapMs = ms
      bestLapRowsCount = 1
    } else if (ms === bestLapMs) {
      bestLapRowsCount += 1
    }
  }

  if (bestLapMs == null) {
    gv = "warn"
    notes.push("GV non rilevata.")
  } else if (bestLapRowsCount > 1) {
    gv = "warn"
    notes.push("Possibile pari miglior giro.")
  }

  // ---------------- META ----------------
  const garaValue = String(effectiveGara || "").trim()
  const lobbyValue = String(unionMeta.lobby || "").trim()
  const legaValue = String(effectiveLega || "").trim()

  if (!garaValue || garaValue === "-") {
  gara = "warn"
  notes.push("Numero gara non rilevato.")
} else {
  const numericGara = Number(garaValue)

  if (!Number.isNaN(numericGara) && numericGara === 18) {
    gara = "warn"
    notes.push("Numero gara sospetto rilevato automaticamente. Inserisci manualmente.")
  }
}

  if (!lobbyValue && unionMode) {
    lobby = "warn"
    notes.push("Lobby non rilevata.")
  }

  if (!legaValue) {
    lega = "warn"
    notes.push("Lega non rilevata.")
  }

  const fields = {
    posizione,
    pilota,
    auto,
    distacchi,
    pp,
    gv,
    gara,
    lobby,
    lega,
  }

  const values = Object.values(fields)
  const okCount = values.filter((v) => v === "ok").length
  const warnCount = values.filter((v) => v === "warn").length
  const errorCount = values.filter((v) => v === "error").length

  let percentage = 100
  let overallStatus: "ok" | "warn" | "error" = "ok"

  if (errorCount > 0) {
    overallStatus = "error"
    percentage = Math.round(((okCount + warnCount * 0.5) / values.length) * 100)
  } else if (warnCount > 0) {
    overallStatus = "warn"
    percentage = Math.round(((okCount + warnCount * 0.8) / values.length) * 100)
  }

  if (percentage < 0) percentage = 0
  if (percentage > 100) percentage = 100

  return {
    overallStatus,
    percentage,
    fields,
    notes,
  }
}, [finalRows, unionMeta, unionMode, effectiveGara, effectiveLega])

  const dgTableRows = useMemo<DisplayRow[]>(() => {
    if (!shouldSyncDgTableWithManualEdits) {
      return [...displayRows].sort((a, b) => a.posGara - b.posGara)
    }

    return [...finalRows].sort((a, b) => a.posGara - b.posGara)
  }, [shouldSyncDgTableWithManualEdits, displayRows, finalRows])

  const dgInfo = useMemo(() => {
    const leaderRow = dgTableRows.find((r) => r.posGara === 1) || dgTableRows[0]
    const leaderMs = leaderRow ? parseAbsoluteRaceTimeMs(leaderRow.tempoTotaleGara) : null

    return dgTableRows.map((row, index) => {
      const key = getPrtRowStableKey(row.sourcePosGara)
      const rawTempo = tempoLikeGt7(row)
      const isDoppiato = isDoppiatoValue(rawTempo)
      const isDnf = /^DNF$/i.test(rawTempo.trim())
      const manualGap = (lapOverrides[key] || "").trim()
      const manualGapMs = isDoppiato ? parseManualLeaderGapInputMs(manualGap) : null
      const comparable = manualGapMs != null || isRowComparable(row, leaderMs)

      return {
        index,
        row,
        key,
        isDoppiato,
        isDnf,
        comparable,
        canEditPenalty: true,
        manualGap,
        manualGapValid: manualGap.length === 0 ? true : manualGapMs != null,
        manualGapMs,
      }
    })
  }, [dgTableRows, lapOverrides])

  const finalCsv = useMemo(
  () => buildCsvFromRows(finalRows, { ...unionMeta, gara: normalizedGaraForOutput, lega: effectiveLega }),
  [finalRows, unionMeta, normalizedGaraForOutput, effectiveLega]
)

  const hasAnyPenalty = useMemo(
    () => Object.values(penalties).some((entries) => (entries || []).length > 0),
    [penalties]
  )

  const winner = useMemo(() => finalRows[0]?.pilota || "-", [finalRows])
  

  const currentRaceSnapshot = useMemo<SavedRaceState>(() => {
  return championshipState.races[currentRace] || {}
}, [championshipState, currentRace])

const currentRoundMovements = useMemo<RoundMovementState>(() => {
  return championshipState.roundMovements?.[currentRace] || {}
}, [championshipState, currentRace])

function getRoundMovementsForLeague(league: ChampionshipLeagueKey): LeagueMovementEntry[] {
  return currentRoundMovements[league] || []
}

function saveRoundMovementsForLeague(
  league: ChampionshipLeagueKey,
  entries: LeagueMovementEntry[]
) {
  setChampionshipState((prev) => ({
    ...prev,
    roundMovements: {
      ...prev.roundMovements,
      [currentRace]: {
        ...(prev.roundMovements?.[currentRace] || {}),
        [league]: entries,
      },
    },
  }))
}

function addRoundMovementEntry(
  league: ChampionshipLeagueKey,
  entry: LeagueMovementEntry
) {
  const currentEntries = getRoundMovementsForLeague(league)

  saveRoundMovementsForLeague(league, [...currentEntries, entry])
}

function removeRoundMovementEntry(
  league: ChampionshipLeagueKey,
  indexToRemove: number
) {
  const currentEntries = getRoundMovementsForLeague(league)

  saveRoundMovementsForLeague(
    league,
    currentEntries.filter((_, index) => index !== indexToRemove)
  )
}

function clearRoundMovementsForLeague(league: ChampionshipLeagueKey) {
  setChampionshipState((prev) => {
    const currentRoundState = { ...(prev.roundMovements?.[currentRace] || {}) }
    delete currentRoundState[league]

    return {
      ...prev,
      roundMovements: {
        ...prev.roundMovements,
        [currentRace]: currentRoundState,
      },
    }
  })
}

function clearAllRoundMovements(round: number) {
  setChampionshipState((prev) => {
    const nextRoundMovements = { ...(prev.roundMovements || {}) }
    delete nextRoundMovements[round]

    return {
      ...prev,
      roundMovements: nextRoundMovements,
    }
  })
}

function getAutoTargetLeague(
  fromLeague: ChampionshipLeagueKey,
  type: MovementType
): ChampionshipLeagueKey {
  const index = CHAMPIONSHIP_LEAGUES.indexOf(fromLeague)

  if (type === "promote") {
    return CHAMPIONSHIP_LEAGUES[index - 1] || fromLeague
  }

  if (type === "relegate") {
    return CHAMPIONSHIP_LEAGUES[index + 1] || fromLeague
  }

  return fromLeague
}

function resetMovementDraft(baseLeague?: ChampionshipLeagueKey) {
  const nextLeague = baseLeague || selectedLeague
  const autoTarget = getAutoTargetLeague(nextLeague, "promote")

  setMovementDraftLeague(nextLeague)
  setMovementDraftDriverName("")
  setMovementDraftType("promote")
  setMovementDraftTargetLeague(autoTarget)
  setMovementDrawerAction("move")
  setMovementDraftTargetDriver("")
}

useEffect(() => {
  const autoTarget = getAutoTargetLeague(
    movementDraftLeague,
    movementDraftType
  )

  setMovementDraftTargetLeague(autoTarget)
}, [movementDraftLeague, movementDraftType])

useEffect(() => {
  const availablePilots = workbenchDriverLeagueMap[movementDraftLeague] || []

  if (!availablePilots.includes(movementDraftDriverName)) {
    setMovementDraftDriverName("")
  }
}, [movementDraftLeague, movementDraftDriverName, workbenchDriverLeagueMap])

function getPreviousMovementCheckpoint(round: number) {
  if (round === 6) return 3
  if (round === 9) return 6
  if (round === 12) return 9
  return 0
}

function getDetectedBasePointsForMovement(driverName: string, movementRound: number) {
  const checkpoint = getPreviousMovementCheckpoint(movementRound)
  if (checkpoint <= 0) return 0

  const driverKey = normalizeDriverNameForChampionship(driverName)
  const driver = driverChampionship.find(
    (item) => normalizeDriverNameForChampionship(item.pilota) === driverKey
  )

  if (!driver) return 0

  return Object.entries(driver.racePoints).reduce((sum, [race, points]) => {
    const raceNumber = Number(race)
    return raceNumber <= checkpoint ? sum + points : sum
  }, 0)
}

function submitMovementDraft() {
  const cleanDriverName = String(movementDraftDriverName || "").trim()
  if (!cleanDriverName) return

  const createdEntry: LeagueMovementEntry = {
    driverName: cleanDriverName,
    fromLeague: movementDraftLeague,
    toLeague: movementDraftTargetLeague,
    type: movementDraftType,
    drawerAction: movementDrawerAction,
    targetDriverName: movementDraftTargetDriver || null,
    basePointsOverride: null,
  }

  const previousCheckpoint = getPreviousMovementCheckpoint(currentRace)

  if (previousCheckpoint > 0) {
    const detectedBase = getDetectedBasePointsForMovement(cleanDriverName, currentRace)

    setPendingMovementEntry(createdEntry)
    setDetectedMovementBasePoints(detectedBase)
    setMovementManualBasePoints(String(detectedBase))
    setMovementBaseMode("detected")
    setShowMovementBaseModal(true)
    return
  }

  addRoundMovementEntry(movementDraftLeague, createdEntry)
  setLastCreatedMovement(createdEntry)

  resetMovementDraft(movementDraftLeague)
  setShowMovementCreatedModal(true)
}

function confirmPendingMovementWithBase() {
  if (!pendingMovementEntry) return

  const manualValue = Number(movementManualBasePoints)
  const finalBase =
    movementBaseMode === "manual" && Number.isFinite(manualValue)
      ? manualValue
      : detectedMovementBasePoints

  const completedEntry: LeagueMovementEntry = {
    ...pendingMovementEntry,
    basePointsOverride: finalBase,
  }

  addRoundMovementEntry(completedEntry.fromLeague, completedEntry)
  setLastCreatedMovement(completedEntry)

  resetMovementDraft(completedEntry.fromLeague)

  setPendingMovementEntry(null)
  setShowMovementBaseModal(false)
  setShowMovementCreatedModal(true)
}

function applySingleMovementToDrawer(entry: LeagueMovementEntry) {
  setWorkbenchDriverLeagueMap((prev) => {
    const next: DriverLeagueMap = {
      ELITE: [...prev.ELITE],
      PLATINUM: [...prev.PLATINUM],
      MASTER: [...prev.MASTER],
      PRO: [...prev.PRO],
      GT: [...prev.GT],
    }

    const normalizedDriver = normalizeDriverNameForChampionship(entry.driverName)
    const normalizedTarget = normalizeDriverNameForChampionship(entry.targetDriverName || "")

    const movingDriverName =
      next[entry.fromLeague].find(
        (pilot) => normalizeDriverNameForChampionship(pilot) === normalizedDriver
      ) || entry.driverName

    if (!movingDriverName) {
      return prev
    }

    if (entry.drawerAction === "move") {
      next[entry.fromLeague] = next[entry.fromLeague].filter(
        (pilot) => normalizeDriverNameForChampionship(pilot) !== normalizedDriver
      )

      const alreadyExistsInTarget = next[entry.toLeague].some(
        (pilot) => normalizeDriverNameForChampionship(pilot) === normalizedDriver
      )

      if (!alreadyExistsInTarget) {
        next[entry.toLeague].push(movingDriverName)
      }
    }

    if (entry.drawerAction === "swap") {
      if (!normalizedTarget) return prev

      const targetDriverName =
        next[entry.toLeague].find(
          (pilot) => normalizeDriverNameForChampionship(pilot) === normalizedTarget
        ) || entry.targetDriverName

      if (!targetDriverName) return prev

      next[entry.fromLeague] = next[entry.fromLeague].filter(
        (pilot) => normalizeDriverNameForChampionship(pilot) !== normalizedDriver
      )

      next[entry.toLeague] = next[entry.toLeague].filter(
        (pilot) => normalizeDriverNameForChampionship(pilot) !== normalizedTarget
      )

      const movingAlreadyInTarget = next[entry.toLeague].some(
        (pilot) => normalizeDriverNameForChampionship(pilot) === normalizedDriver
      )

      if (!movingAlreadyInTarget) {
        next[entry.toLeague].push(movingDriverName)
      }

      const targetAlreadyInSource = next[entry.fromLeague].some(
        (pilot) => normalizeDriverNameForChampionship(pilot) === normalizedTarget
      )

      if (!targetAlreadyInSource) {
        next[entry.fromLeague].push(targetDriverName)
      }
    }

    if (entry.drawerAction === "replace_remove") {
      if (!normalizedTarget) return prev

      const targetExists = next[entry.toLeague].some(
        (pilot) => normalizeDriverNameForChampionship(pilot) === normalizedTarget
      )

      if (!targetExists) return prev

      next[entry.fromLeague] = next[entry.fromLeague].filter(
        (pilot) => normalizeDriverNameForChampionship(pilot) !== normalizedDriver
      )

      next[entry.toLeague] = next[entry.toLeague].filter(
        (pilot) => normalizeDriverNameForChampionship(pilot) !== normalizedTarget
      )

      const alreadyExistsInTarget = next[entry.toLeague].some(
        (pilot) => normalizeDriverNameForChampionship(pilot) === normalizedDriver
      )

      if (!alreadyExistsInTarget) {
        next[entry.toLeague].push(movingDriverName)
      }
    }

    for (const league of CHAMPIONSHIP_LEAGUES) {
      next[league] = next[league]
        .filter(Boolean)
        .filter((pilot, index, arr) => {
          const norm = normalizeDriverNameForChampionship(pilot)
          return arr.findIndex((p) => normalizeDriverNameForChampionship(p) === norm) === index
        })
        .sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" }))
    }

    return next
  })
}

function applyCurrentRoundMovementsToDrawer() {
  if (!hasCurrentRoundMovements) return

  setWorkbenchDriverLeagueMap((prev) => {
    const next: DriverLeagueMap = {
      ELITE: [...prev.ELITE],
      PLATINUM: [...prev.PLATINUM],
      MASTER: [...prev.MASTER],
      PRO: [...prev.PRO],
      GT: [...prev.GT],
    }

    for (const league of CHAMPIONSHIP_LEAGUES) {
  const entries = getRoundMovementsForLeague(league)

  for (const entry of entries) {
    const normalizedDriver = normalizeDriverNameForChampionship(entry.driverName)
    const normalizedTarget = normalizeDriverNameForChampionship(entry.targetDriverName || "")

    const movingDriverName =
      next[entry.fromLeague].find(
        (pilot) => normalizeDriverNameForChampionship(pilot) === normalizedDriver
      ) || entry.driverName

    if (!movingDriverName) continue

    // MOVE = sposta il pilota dalla lega origine alla lega destinazione
    if (entry.drawerAction === "move") {
      next[entry.fromLeague] = next[entry.fromLeague].filter(
        (pilot) => normalizeDriverNameForChampionship(pilot) !== normalizedDriver
      )

      const alreadyExistsInTarget = next[entry.toLeague].some(
        (pilot) => normalizeDriverNameForChampionship(pilot) === normalizedDriver
      )

      if (!alreadyExistsInTarget) {
        next[entry.toLeague].push(movingDriverName)
      }

      continue
    }

    // SWAP = scambia pilota origine con pilota target
    if (entry.drawerAction === "swap") {
      if (!normalizedTarget) continue

      const targetDriverName =
        next[entry.toLeague].find(
          (pilot) => normalizeDriverNameForChampionship(pilot) === normalizedTarget
        ) || entry.targetDriverName

      if (!targetDriverName) continue

      next[entry.fromLeague] = next[entry.fromLeague].filter(
        (pilot) => normalizeDriverNameForChampionship(pilot) !== normalizedDriver
      )

      next[entry.toLeague] = next[entry.toLeague].filter(
        (pilot) => normalizeDriverNameForChampionship(pilot) !== normalizedTarget
      )

      const movingAlreadyInTarget = next[entry.toLeague].some(
        (pilot) => normalizeDriverNameForChampionship(pilot) === normalizedDriver
      )

      if (!movingAlreadyInTarget) {
        next[entry.toLeague].push(movingDriverName)
      }

      const targetAlreadyInSource = next[entry.fromLeague].some(
        (pilot) => normalizeDriverNameForChampionship(pilot) === normalizedTarget
      )

      if (!targetAlreadyInSource) {
        next[entry.fromLeague].push(targetDriverName)
      }

      continue
    }

    // REPLACE_REMOVE = sposta il pilota origine nella lega target
    // ed elimina il pilota target dalla lega destinazione
    if (entry.drawerAction === "replace_remove") {
      if (!normalizedTarget) continue

      const targetExists = next[entry.toLeague].some(
        (pilot) => normalizeDriverNameForChampionship(pilot) === normalizedTarget
      )

      if (!targetExists) continue

      next[entry.fromLeague] = next[entry.fromLeague].filter(
        (pilot) => normalizeDriverNameForChampionship(pilot) !== normalizedDriver
      )

      next[entry.toLeague] = next[entry.toLeague].filter(
        (pilot) => normalizeDriverNameForChampionship(pilot) !== normalizedTarget
      )

      const alreadyExistsInTarget = next[entry.toLeague].some(
        (pilot) => normalizeDriverNameForChampionship(pilot) === normalizedDriver
      )

      if (!alreadyExistsInTarget) {
        next[entry.toLeague].push(movingDriverName)
      }

      continue
    }
  }
}

    for (const league of CHAMPIONSHIP_LEAGUES) {
      next[league] = next[league]
        .filter(Boolean)
        .filter((pilot, index, arr) => {
          const norm = normalizeDriverNameForChampionship(pilot)
          return arr.findIndex((p) => normalizeDriverNameForChampionship(p) === norm) === index
        })
        .sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" }))
    }

    return next
  })
}

const hasCurrentRoundMovements = useMemo(() => {
  return CHAMPIONSHIP_LEAGUES.some((league) => {
    const entries = currentRoundMovements[league] || []
    return entries.length > 0
  })
}, [currentRoundMovements])

const savedLeagueInCurrentRace = useMemo(() => {
  return !!currentRaceSnapshot[selectedLeague]
}, [currentRaceSnapshot, selectedLeague])

const savedLeagueStatus = useMemo(() => {
  return {
    ELITE: !!currentRaceSnapshot.ELITE,
    PLATINUM: !!currentRaceSnapshot.PLATINUM,
    MASTER: !!currentRaceSnapshot.MASTER,
    PRO: !!currentRaceSnapshot.PRO,
    GT: !!currentRaceSnapshot.GT,
  }
}, [currentRaceSnapshot])

const availableImportLeagues = useMemo(() => {
  return CHAMPIONSHIP_LEAGUES.filter((league) => !savedLeagueStatus[league])
}, [savedLeagueStatus])

const readyLeagueHtmlCount = useMemo(() => {
  return CHAMPIONSHIP_LEAGUES.filter((league) =>
    !!String(uploadedLeagueHtmls[league] || "").trim()
  ).length
}, [uploadedLeagueHtmls])

const canExportGeneralHtml = readyLeagueHtmlCount >= 3

const isCurrentRaceComplete = useMemo(() => {
  return CHAMPIONSHIP_LEAGUES.every((league) => !!currentRaceSnapshot[league])
}, [currentRaceSnapshot])

const driverChampionship = useMemo<DriverChampionshipRow[]>(() => {
  const map = new Map<string, DriverChampionshipRow>()
  const officialLeagueByDriver = new Map<string, ChampionshipLeagueKey>()

  const savedRaceNumbersByLeague: Record<ChampionshipLeagueKey, number[]> = {
  ELITE: [],
  PLATINUM: [],
  MASTER: [],
  PRO: [],
  GT: [],
}

for (let raceNumber = 3; raceNumber <= currentRace; raceNumber++) {
  const raceState = championshipState.races[raceNumber]
  if (!raceState) continue

  for (const league of CHAMPIONSHIP_LEAGUES) {
    if (raceState[league]) {
      savedRaceNumbersByLeague[league].push(raceNumber)
    }
  }
}

  for (const league of CHAMPIONSHIP_LEAGUES) {
  for (const pilot of workbenchDriverLeagueMap[league] || []) {
    const key = normalizeDriverNameForChampionship(pilot)
    if (!key) continue
    officialLeagueByDriver.set(key, league)
  }
}

  for (const league of CHAMPIONSHIP_LEAGUES) {
    const pilotsInDrawer = workbenchDriverLeagueMap[league] || []

    for (const pilotName of pilotsInDrawer) {
      const cleanPilotName = String(pilotName || "").trim()
      if (!cleanPilotName) continue

      const key = normalizeDriverNameForChampionship(cleanPilotName)
      if (!key || map.has(key)) continue

      const entryRace = getDriverEntryRace(cleanPilotName)
if (currentRace < entryRace) continue

      const g1Raw = manualRace12Draft[key]?.g1 ?? ""
      const g2Raw = manualRace12Draft[key]?.g2 ?? ""

      const g1Parsed = parseManualChampionshipCell(g1Raw)
      const g2Parsed = parseManualChampionshipCell(g2Raw)

      const racePoints: Record<number, number> = {}
      const raceResults: Partial<Record<number, ChampionshipRaceCell>> = {}

      if (g1Parsed) {
        racePoints[1] = g1Parsed.points
        raceResults[1] = g1Parsed
      }

      if (g2Parsed) {
        racePoints[2] = g2Parsed.points
        raceResults[2] = g2Parsed
      }

      map.set(key, {
        pilota: cleanPilotName,
        league,
        baselinePoints: 0,
        racePoints,
        raceResults,
        totalPoints: 0,
        racesCounted: (g1Parsed ? 1 : 0) + (g2Parsed ? 1 : 0),
      })
    }
  }

  for (const entry of driverBaselines) {
    const key = normalizeDriverNameForChampionship(entry.pilota)
    if (!key) continue

    const g1Raw = manualRace12Draft[key]?.g1 ?? ""
    const g2Raw = manualRace12Draft[key]?.g2 ?? ""

    const g1Parsed = parseManualChampionshipCell(g1Raw)
    const g2Parsed = parseManualChampionshipCell(g2Raw)

    const racePoints: Record<number, number> = {}
    const raceResults: Partial<Record<number, ChampionshipRaceCell>> = {}

    if (g1Parsed) {
      racePoints[1] = g1Parsed.points
      raceResults[1] = g1Parsed
    }

    if (g2Parsed) {
      racePoints[2] = g2Parsed.points
      raceResults[2] = g2Parsed
    }

    const existing = map.get(key)

    if (existing) {
      existing.pilota = entry.pilota
      existing.league = officialLeagueByDriver.get(key) || entry.league
    } else {
      map.set(key, {
        pilota: entry.pilota,
        league: officialLeagueByDriver.get(key) || entry.league,
        baselinePoints: 0,
        racePoints,
        raceResults,
        totalPoints: 0,
        racesCounted: (g1Parsed ? 1 : 0) + (g2Parsed ? 1 : 0),
      })
    }
  }

  for (let raceNumber = 3; raceNumber <= currentRace; raceNumber++) {
  const raceState = championshipState.races[raceNumber]
  if (!raceState) continue

  for (const league of CHAMPIONSHIP_LEAGUES) {
    const snapshot = raceState[league]
    if (!snapshot || !Array.isArray(snapshot.finalRows)) continue

    const snapshotPointsMapRaw = buildSnapshotRacePointsMap(
  snapshot.finalRows,
  snapshot.bestRaceLap || ""
)

const isSpecialGara7PlatinumPoints =
  raceNumber === 7 && league === "PLATINUM"

const snapshotPointsMap = isSpecialGara7PlatinumPoints
  ? Object.fromEntries(
      Object.entries(snapshotPointsMapRaw).map(([pilot, points]) => [
        pilot,
        Math.ceil(Number(points || 0) / 2),
      ])
    )
  : snapshotPointsMapRaw

    for (const row of snapshot.finalRows) {
      const pilotName = String(row.pilota || "").trim()
      if (!pilotName) continue

      const key = normalizeDriverNameForChampionship(pilotName)
      if (!key) continue

      const baseCell = buildSavedRaceCell(row, snapshot.bestRaceLap || "")
const resolvedPoints = snapshotPointsMap[pilotName] ?? 0
const rawTempo = tempoLikeGt7(row).trim().toUpperCase()

let resolvedStatus: ChampionshipCellStatus | null = baseCell.status

if (rawTempo === "DNFV") {
  resolvedStatus = "DNFV"
} else if (rawTempo === "DNF-I") {
  resolvedStatus = "DNF-I"
} else if (rawTempo === "DNF") {
  resolvedStatus = "DNF"
} else if (rawTempo === "DNP") {
  resolvedStatus = "DNP"
} else if (rawTempo === "BOX") {
  resolvedStatus = "BOX"
} else if (rawTempo === "DSQ") {
  resolvedStatus = "DSQ"
}

const cell: ChampionshipRaceCell = {
  ...baseCell,
  status: resolvedStatus,
  position: resolvedStatus ? null : baseCell.position,
  points: resolvedPoints,
}

const existing = map.get(key)

      if (existing) {
  existing.racePoints[raceNumber] = resolvedPoints
  existing.raceResults[raceNumber] = cell
        existing.racesCounted += 1
        existing.league = officialLeagueByDriver.get(key) || league
      } else {
        const g1Raw = manualRace12Draft[key]?.g1 ?? ""
        const g2Raw = manualRace12Draft[key]?.g2 ?? ""

        const g1Parsed = parseManualChampionshipCell(g1Raw)
        const g2Parsed = parseManualChampionshipCell(g2Raw)

        const racePoints: Record<number, number> = {}
        const raceResults: Partial<Record<number, ChampionshipRaceCell>> = {}

        if (g1Parsed) {
          racePoints[1] = g1Parsed.points
          raceResults[1] = g1Parsed
        }

        if (g2Parsed) {
          racePoints[2] = g2Parsed.points
          raceResults[2] = g2Parsed
        }

        racePoints[raceNumber] = resolvedPoints
raceResults[raceNumber] = cell

        map.set(key, {
          pilota: pilotName,
          league: officialLeagueByDriver.get(key) || league,
          baselinePoints: 0,
          racePoints,
          raceResults,
          totalPoints: 0,
          racesCounted: (g1Parsed ? 1 : 0) + (g2Parsed ? 1 : 0) + 1,
        })
      }
    }
  }
}

const activeRoundMovementByDriver = new Map<
  string,
  {
    type: MovementType
    fromLeague: ChampionshipLeagueKey
    toLeague: ChampionshipLeagueKey
  }
>()

const roundMovementState = championshipState.roundMovements?.[currentRace] || {}

for (const league of CHAMPIONSHIP_LEAGUES) {
  const entries = roundMovementState[league] || []

  for (const entry of entries) {
    const key = normalizeDriverNameForChampionship(entry.driverName)
    if (!key) continue

    activeRoundMovementByDriver.set(key, {
      type: entry.type,
      fromLeague: entry.fromLeague,
      toLeague: entry.toLeague,
    })
  }
} 

for (const driver of map.values()) {
  const driverKey = normalizeDriverNameForChampionship(driver.pilota)
  const currentOfficialLeague = officialLeagueByDriver.get(driverKey)

  if (currentOfficialLeague) {
    driver.league = currentOfficialLeague
  }

  const currentLeague = normalizeLeagueKey(driver.league)

  if (currentLeague) {
  for (const raceNumber of savedRaceNumbersByLeague[currentLeague]) {
    if (raceNumber < getDriverEntryRace(driver.pilota)) continue

    if (!driver.raceResults[raceNumber]) {
      driver.raceResults[raceNumber] = {
          position: null,
          status: "DNP",
          pp: false,
          gv: false,
          points: 0,
          rawText: "dnp",
        }

        driver.racePoints[raceNumber] = 0
      }
    }
  }

  const activeMovement = (() => {
  const movementRounds = [12, 9, 6, 3]

  for (const movementRound of movementRounds) {
    if (currentRace < movementRound) continue

    const movementState = championshipState.roundMovements?.[movementRound] || {}

    for (const league of CHAMPIONSHIP_LEAGUES) {
      const entries = movementState[league] || []

      for (const entry of entries) {
        const key = normalizeDriverNameForChampionship(entry.driverName)

        if (key === driverKey) {
          return {
            entry,
            movementRound,
          }
        }
      }
    }
  }

  return null
})()

if (activeMovement) {
  const movementType = activeMovement.entry.type
  const movementRound = activeMovement.movementRound
  const multiplier = movementType === "promote" ? 0.6 : 1.5

  function getMovementForRound(round: number) {
  const movementState = championshipState.roundMovements?.[round] || {}

  for (const league of CHAMPIONSHIP_LEAGUES) {
    const entries = movementState[league] || []

    for (const entry of entries) {
      const key = normalizeDriverNameForChampionship(entry.driverName)

      if (key === driverKey) {
        return entry
      }
    }
  }

  return null
}

function getRacePoints(raceNumber: number) {
  return driver.racePoints[raceNumber] || 0
}

function getCorrectTotalUntilRound(untilRound: number) {
    
  let total = 0
  let previousCheckpoint = 0

  for (const checkpoint of [3, 6, 9, 12]) {
    if (checkpoint > untilRound) break

    const movement = getMovementForRound(checkpoint)

    const blockPoints = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
      .filter((raceNumber) => raceNumber > previousCheckpoint && raceNumber <= checkpoint)
      .reduce((sum, raceNumber) => sum + getRacePoints(raceNumber), 0)

    if (movement) {
      const multiplier = movement.type === "promote" ? 0.6 : 1.5
      total += Math.ceil(blockPoints * multiplier)
    } else {
      total += blockPoints
    }

    previousCheckpoint = checkpoint
  }

  const remainingPoints = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
    .filter((raceNumber) => raceNumber > previousCheckpoint && raceNumber <= untilRound)
    .reduce((sum, raceNumber) => sum + getRacePoints(raceNumber), 0)

  return total + remainingPoints
}

const baseUntilRace = movementRound - 3

const basePoints =
  activeMovement.entry.basePointsOverride != null
    ? activeMovement.entry.basePointsOverride
    : getCorrectTotalUntilRound(baseUntilRace)
const recalculationPointsFull = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
  .filter((raceNumber) => raceNumber > baseUntilRace && raceNumber <= movementRound)
  .reduce((sum, raceNumber) => sum + getRacePoints(raceNumber), 0)

const afterMovementPoints = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
  .filter((raceNumber) => raceNumber > movementRound)
  .reduce((sum, raceNumber) => sum + getRacePoints(raceNumber), 0)

  driver.totalPoints =
    basePoints +
    Math.ceil(recalculationPointsFull * multiplier) +
    afterMovementPoints

  const movementCell = driver.raceResults[movementRound]

  if (movementCell) {
    driver.raceResults[movementRound] = {
      ...movementCell,
      specialMovement: movementType,
    }
  }
} else {
  driver.totalPoints = Object.values(driver.racePoints).reduce((a, b) => a + b, 0)
}
}
// Frecce storiche promo/retro: solo grafica, non modifica punti
for (const movementRound of [3, 6, 9, 12]) {
  if (movementRound > currentRace) continue

  const historicalRoundMovementState =
    championshipState.roundMovements?.[movementRound] || {}

  for (const league of CHAMPIONSHIP_LEAGUES) {
    const entries = historicalRoundMovementState[league] || []

    for (const entry of entries) {
      const key = normalizeDriverNameForChampionship(entry.driverName)
      if (!key) continue

      const driver = map.get(key)
      const cell = driver?.raceResults[movementRound]

      if (!driver || !cell) continue

      driver.raceResults[movementRound] = {
        ...cell,
        specialMovement: entry.type,
      }
    }
  }
}
 for (const driver of map.values()) {
  applyFourthDnpAsDsqRule(driver)
}

const activeDrawerDrivers = new Set(
  CHAMPIONSHIP_LEAGUES.flatMap((league) =>
    (workbenchDriverLeagueMap[league] || []).map((pilot) =>
      normalizeDriverNameForChampionship(pilot)
    )
  )
)

return Array.from(map.values())
  .filter((driver) => {
    const driverKey = normalizeDriverNameForChampionship(driver.pilota)

    if (!activeDrawerDrivers.has(driverKey)) return false

    const disqualificationRace = getDnpDisqualificationRace(driver)

  // Se non è mai stato squalificato → resta
  if (disqualificationRace == null) return true

  // Se siamo nella gara della DSQ → resta visibile
  if (currentRace <= disqualificationRace) return true

  // Da qui in poi: siamo DOPO la DSQ
  // 👉 resta SOLO se è ancora nel cassetto

  const isStillInDrawer = CHAMPIONSHIP_LEAGUES.some((league) =>
    (workbenchDriverLeagueMap[league] || []).some(
      (p) =>
        normalizeDriverNameForChampionship(p) ===
        normalizeDriverNameForChampionship(driver.pilota)
    )
  )

  return isStillInDrawer
})
  .sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
    return a.pilota.localeCompare(b.pilota, "it", { sensitivity: "base" })
  })
}, [driverBaselines, championshipState, currentRace, manualRace12Draft, workbenchDriverLeagueMap])

const championshipDriversCount = useMemo(() => {
  return driverChampionship.length
}, [driverChampionship])

const championshipRacesIncludedLabel = useMemo(() => {
  if (currentRace < 3) return "Solo base dopo Gara 2"
  return `Base dopo Gara 2 + Gare 3-${currentRace}`
}, [currentRace])

const driverChampionshipByLeague = useMemo(() => {
  return {
    ELITE: driverChampionship.filter((driver) => driver.league === "ELITE"),
    PLATINUM: driverChampionship.filter((driver) => driver.league === "PLATINUM"),
    MASTER: driverChampionship.filter((driver) => driver.league === "MASTER"),
    PRO: driverChampionship.filter((driver) => driver.league === "PRO"),
    GT: driverChampionship.filter((driver) => driver.league === "GT"),
  }
}, [driverChampionship])

const finalRowsWithDnp = useMemo<DisplayRow[]>(() => {
  const raceLeague = normalizeLeagueKey(effectiveLega) || selectedLeague
  const drawerPilots = workbenchDriverLeagueMap[raceLeague] || []

  const existingKeys = new Set(
    finalRows.map((row) => normalizeDriverNameForChampionship(row.pilota))
  )

  const recoveredDsqRows: DisplayRow[] = driverChampionship
    .filter((driver) => {
      const driverLeague = normalizeLeagueKey(driver.league)
      const cell = driver.raceResults[currentRace]
      const key = normalizeDriverNameForChampionship(driver.pilota)

      return (
        driverLeague === raceLeague &&
        cell?.status === "DSQ" &&
        key &&
        !existingKeys.has(key)
      )
    })
    .map((driver, index) => ({
  sourcePosGara: 9000 + index,
  posGara: finalRows.length + index + 1,
  pilota: driver.pilota,
  auto: "---",
  tempoTotaleGara: "DNP",
  distaccoDalPrimo: "DNP",
  migliorGiroGara: "",
  tempoQualifica: "",
  pole: "",
}))

  const existingKeysAfterDsq = new Set([
    ...Array.from(existingKeys),
    ...recoveredDsqRows.map((row) =>
      normalizeDriverNameForChampionship(row.pilota)
    ),
  ])

  const missingPilots = drawerPilots.filter((pilot) => {
    const key = normalizeDriverNameForChampionship(pilot)
    return key && !existingKeysAfterDsq.has(key)
  })

  const dnpRows = missingPilots.map((pilot, index) =>
    createDnpDisplayRow(
      pilot,
      finalRows.length + recoveredDsqRows.length + index + 1
    )
  )

  return [...finalRows, ...recoveredDsqRows, ...dnpRows]
}, [
  finalRows,
  driverChampionship,
  currentRace,
  workbenchDriverLeagueMap,
  effectiveLega,
  selectedLeague,
])

const driversToRemoveAfterDsq = useMemo(() => {
  return driverChampionship.filter((driver) => {
    let dnpOrDsqCount = 0

    for (let raceNumber = 1; raceNumber <= 13; raceNumber++) {
      const cell = driver.raceResults[raceNumber]
      if (!cell) continue

      if (cell.status === "DNP" || cell.status === "DSQ") {
        dnpOrDsqCount += 1
      }
    }

    return dnpOrDsqCount >= 4
  })
}, [driverChampionship])



async function performExportTablePng() {
  if (!exportRef.current || finalRows.length === 0 || exporting) return

    try {
      setExporting(true)
      await new Promise((resolve) => setTimeout(resolve, 140))

      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        width: 1920,
        height: 1080,
        canvasWidth: 1920,
        canvasHeight: 1080,
        backgroundColor: "#07080c",
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
      })

      const link = document.createElement("a")
      link.download = "albixximo_classifica_output.png"
      link.href = dataUrl
      link.click()
    } catch (e: any) {
      setError(`Errore esportazione PNG: ${String(e?.message || e)}`)
    } finally {
      setExporting(false)
    }
  }

  async function downloadChampionshipHtmlExport() {
  const exportNode = championshipHtmlExportRef.current
  if (!exportNode) {
    setError("Nodo HTML classifica non disponibile.")
    return
  }

  const leagueForFile = normalizeLeagueKey(effectiveLega) || selectedLeague

  setLoadingLeagueHtmls((prev) => ({
    ...prev,
    [leagueForFile]: true,
  }))

  try {
    const clone = exportNode.cloneNode(true) as HTMLDivElement

    clone
      .querySelectorAll("[data-html-export-hide='true']")
      .forEach((el) => el.remove())

    const images = Array.from(clone.querySelectorAll("img"))
    for (const img of images) {
      const originalSrc = img.getAttribute("src") || ""
      if (!originalSrc) continue

      try {
        const absoluteSrc = new URL(originalSrc, window.location.origin).href
        const response = await fetch(absoluteSrc)
        const blob = await response.blob()

        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(String(reader.result))
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })

        img.setAttribute("src", dataUrl)
      } catch {
        // lascia src originale
      }
    }

    const exportHtml = clone.outerHTML

    const exportDate = new Date().toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=0.6, minimum-scale=0.4, maximum-scale=5, user-scalable=yes" />
  <title>Classifica Generale Piloti - ${leagueForFile}</title>
  <style>
    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
      min-height: 100%;
      background:
        radial-gradient(1200px 600px at 15% 10%, rgba(255,215,0,0.14), transparent 50%),
        radial-gradient(900px 500px at 85% 20%, rgba(160,90,255,0.16), transparent 50%),
        linear-gradient(180deg, #0b0d12 0%, #07080c 100%);
      color: white;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    }

    body {
      padding: 24px;
    }

    .championship-html-export-shell {
      width: 100%;
      max-width: 1680px;
      margin: 0 auto;
      display: grid;
      gap: 16px;
    }

    .championship-html-export-footer {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      padding: 8px 4px 0 4px;
      font-size: 12px;
      color: rgba(255,255,255,0.58);
      letter-spacing: 0.2px;
    }

    @media (max-width: 700px) {
  html,
body {
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: auto;
}

  body {
    padding: 8px;
  }

  .championship-html-export-shell {
    width: 1260px;
    min-width: 1260px;
    max-width: none;
    margin: 0;
  }

  .championship-html-export-root {
    width: 1260px !important;
    min-width: 1260px !important;
    max-width: none !important;
    margin: 0 !important;
  }

  .championship-html-export-root [style*="overflow-x"] {
    overflow-x: visible !important;
    overflow-y: visible !important;
  }

  .championship-html-export-root table {
    width: 100% !important;
    min-width: 1220px !important;
  }

  .championship-html-export-root > div:first-child {
  display: flex !important;
  flex-wrap: wrap !important;
  align-items: flex-start !important;
  gap: 8px !important;
}.championship-html-export-root > div:first-child,
.championship-html-export-root [style*="justify-content: space-between"] {
  flex-wrap: wrap !important;
  align-items: flex-start !important;
  gap: 8px !important;
}

.championship-html-export-root [style*="PRT Season"],
.championship-html-export-root div,
.championship-html-export-root span {
  white-space: normal !important;
}

.championship-html-export-root img + div,
.championship-html-export-root div:has(img) {
  max-width: 100% !important;
}
}

@media (max-width: 700px) {
  #splashScreen img {
    object-fit: contain;
    background: black;
  }

  #splashText {
    font-size: 24px;
    letter-spacing: 2px;
    top: 10%;
    padding: 0 10px;
  }
}

    @media print {
      html, body {
        background: #0b0d12;
      }

      body {
        padding: 0;
      }

      .championship-html-export-shell {
        max-width: none;
        gap: 12px;
      }
    }
  </style>
</head>
<body>
  <div class="championship-html-export-shell">
    ${exportHtml}
    <div class="championship-html-export-footer">
      <div>Classifica generale piloti • Lega ${leagueForFile}</div>
      <div>${exportDate}</div>
    </div>
  </div>
</body>
</html>`

    setUploadedLeagueHtmls((prev) => {
      const next = {
        ...prev,
        [leagueForFile]: html,
      }

      console.log("SALVATO HTML LEGA:", leagueForFile, Object.keys(next))
      return next
    })

    const blob = new Blob([html], { type: "text/html;charset=utf-8" })
    const url = URL.createObjectURL(blob)

    try {
      const a = document.createElement("a")
      a.href = url
      a.download = `classifica_generale_${leagueForFile.toLowerCase()}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } finally {
      URL.revokeObjectURL(url)
    }
  } catch (e: any) {
    setError(`Errore export HTML classifica: ${String(e?.message || e)}`)
  } finally {
    setLoadingLeagueHtmls((prev) => ({
      ...prev,
      [leagueForFile]: false,
    }))
  }
}

async function downloadChampionshipGeneralHtmlExport() {
  const savedPages: Partial<Record<ChampionshipLeagueKey, string>> = {}

  for (const league of CHAMPIONSHIP_LEAGUES) {
    const html = String(uploadedLeagueHtmls[league] || "").trim()
    if (html) {
      savedPages[league] = html
    }
  }

  const savedLeagues = CHAMPIONSHIP_LEAGUES.filter(
    (league) => !!String(savedPages[league] || "").trim()
  )

  if (savedLeagues.length === 0) {
    setError("Non ci sono HTML di lega caricati. Usa prima 'Carica HTML leghe'.")
    return
  }

  const isMovementRoundForHtml = [3, 6, 9, 12].includes(currentRace)

  const movementSummaryByLeague: Record<
    ChampionshipLeagueKey,
    { promotions: string[]; relegations: string[] }
  > = {
    ELITE: { promotions: [], relegations: [] },
    PLATINUM: { promotions: [], relegations: [] },
    MASTER: { promotions: [], relegations: [] },
    PRO: { promotions: [], relegations: [] },
    GT: { promotions: [], relegations: [] },
  }

  if (isMovementRoundForHtml) {
    const roundMovementState = championshipState.roundMovements?.[currentRace] || {}

    for (const league of CHAMPIONSHIP_LEAGUES) {
      const entries = roundMovementState[league] || []

      for (const entry of entries) {
        const text = `${entry.driverName} • ${entry.fromLeague} → ${entry.toLeague}`

        if (entry.fromLeague === entry.toLeague) continue

        if (entry.type === "promote") {
          if (movementSummaryByLeague[entry.fromLeague]) {
            movementSummaryByLeague[entry.fromLeague].promotions.push(text)
          }

          if (
            movementSummaryByLeague[entry.toLeague] &&
            entry.toLeague !== entry.fromLeague
          ) {
            movementSummaryByLeague[entry.toLeague].promotions.push(text)
          }
        }

        if (entry.type === "relegate") {
          if (movementSummaryByLeague[entry.fromLeague]) {
            movementSummaryByLeague[entry.fromLeague].relegations.push(text)
          }

          if (
            movementSummaryByLeague[entry.toLeague] &&
            entry.toLeague !== entry.fromLeague
          ) {
            movementSummaryByLeague[entry.toLeague].relegations.push(text)
          }
        }
      }
    }
  }

  let logoDataUrl = ""

  try {
    const absoluteSrc = new URL("/prt_logo.png", window.location.origin).href
    const response = await fetch(absoluteSrc)
    const blob = await response.blob()

    logoDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    logoDataUrl = ""
  }

  let splashDataUrl = ""

try {
  const absoluteSrc = new URL("/prt-splash.webp", window.location.origin).href
  const response = await fetch(absoluteSrc)
  const blob = await response.blob()

  splashDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
} catch {
  splashDataUrl = ""
}

let splashMobileDataUrl = ""

try {
  const absoluteSrc = new URL("/prt-splash2.webp", window.location.origin).href
  const response = await fetch(absoluteSrc)
  const blob = await response.blob()

  splashMobileDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
} catch {
  splashMobileDataUrl = ""
}

  const pagesJson = JSON.stringify(savedPages).replace(/<\/script/gi, "<\\/script")
  const movementSummaryJson = JSON.stringify(movementSummaryByLeague).replace(
    /<\/script/gi,
    "<\\/script"
  )

  const exportDate = new Date().toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  const tabsHtml = CHAMPIONSHIP_LEAGUES.map((league) => {
    const hasPage = !!String(savedPages[league] || "").trim()
    return `
      <button
        class="tab-btn ${hasPage ? "saved preloaded" : ""}"
        data-league="${league}"
        ${hasPage ? "" : "disabled"}
        title="${hasPage ? `Apri ${league}` : `${league} non salvata`}"
      >
        ${hasPage ? `${league} ✅` : `${league} —`}
      </button>
    `
  }).join("")

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta
  name="viewport"
  content="width=device-width, initial-scale=0.5, minimum-scale=0.5, maximum-scale=3, user-scalable=yes, viewport-fit=cover"
/>
  <title>PRT Season 2K26 - Portale Classifiche</title>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
      min-height: 100%;
      background:
        radial-gradient(1200px 600px at 15% 10%, rgba(255,215,0,0.14), transparent 50%),
        radial-gradient(900px 500px at 85% 20%, rgba(160,90,255,0.16), transparent 50%),
        linear-gradient(180deg, #0b0d12 0%, #07080c 100%);
      color: white;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    body {
      padding: 24px;
    }

    .shell {
      width: 100%;
      max-width: 1680px;
      margin: 0 auto;
      display: grid;
      gap: 18px;
    }

    .hero {
      position: relative;
      overflow: hidden;
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,0.10);
      background:
        radial-gradient(900px 240px at 10% 10%, rgba(255,215,0,0.16), transparent 60%),
        radial-gradient(700px 240px at 90% 0%, rgba(160,90,255,0.18), transparent 55%),
        linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
      box-shadow: 0 14px 60px rgba(0,0,0,0.45);
      padding: 22px;
      display: grid;
      gap: 18px;
    }

    .hero-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      flex-wrap: wrap;
    }

    .hero-title-wrap {
      display: grid;
      gap: 8px;
      min-width: 0;
    }

    .hero-title {
      font-size: 34px;
      font-weight: 900;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      line-height: 1.02;
      text-shadow: 0 0 18px rgba(255,215,0,0.22);
    }

    .hero-subtitle {
      font-size: 14px;
      opacity: 0.82;
      line-height: 1.4;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 7px 12px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(255,255,255,0.06);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.55px;
      text-transform: uppercase;
      white-space: nowrap;
      width: fit-content;
    }

    .hero-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .hero-logo img {
      height: 120px;
      width: auto;
      max-width: 100%;
      filter:
        drop-shadow(0 0 18px rgba(255,215,0,0.55))
        drop-shadow(0 0 40px rgba(255,215,0,0.25));
    }

    .tabs {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  width: 100%;
}

.race-png-panel {
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(0,0,0,0.22);
  padding: 16px;
  display: grid;
  gap: 12px;
}

.race-png-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.race-png-title {
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  line-height: 1.1;

  color: white;

  text-shadow:
    0 0 10px rgba(255,215,0,0.35),
    0 0 18px rgba(160,90,255,0.25);
}

.race-png-select {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.28);
  color: white;
  font-weight: 900;
}

.race-png-tabs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.race-png-viewer {
  display: none;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(0,0,0,0.30);
}

.race-png-viewer.visible {
  display: block;
}

.race-png-viewer img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 14px;
}

.race-png-viewer.loading::before {
  content: "Caricamento...";
  display: block;
  text-align: center;
  font-weight: 900;
  letter-spacing: 1px;
  padding: 40px 0;
  opacity: 0.7;
}

.tab-btn {
  appearance: none;
  border: none;
  outline: none;
  cursor: pointer;
  width: 100%;
  min-width: 0;
  padding: 14px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.04);
  color: white;
  font-weight: 900;
  font-size: 12px;
  letter-spacing: 0.45px;
  text-transform: uppercase;
  transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
  white-space: nowrap;
  text-align: center;
}

    .tab-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      border-color: rgba(255,215,0,0.22);
      box-shadow: 0 0 18px rgba(255,215,0,0.08);
    }

    .tab-btn.saved {
      background: rgba(34,197,94,0.14);
      border-color: rgba(34,197,94,0.30);
      box-shadow: 0 0 18px rgba(34,197,94,0.08);
    }

    .tab-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 6px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: linear-gradient(180deg, #22c55e, #15803d);
  color: white;
  font-size: 13px;
  font-weight: 900;
  box-shadow:
    0 0 8px rgba(34,197,94,0.85),
    0 0 18px rgba(34,197,94,0.45);
  vertical-align: middle;
}

.tab-missing {
  opacity: 0.55;
}

    .tab-btn.preloaded {
      opacity: 1;
    }

    .tab-btn.active {
      background: linear-gradient(180deg, rgba(255,215,0,0.16), rgba(34,197,94,0.10));
      border-color: rgba(255,215,0,0.42);
      box-shadow: 0 0 18px rgba(255,215,0,0.12);
    }

    .tab-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      box-shadow: none;
    }

    .tab-btn.active-loading {
  background: rgba(255,215,0,0.18);
  border-color: rgba(255,215,0,0.45);
  box-shadow: 0 0 18px rgba(255,215,0,0.18);
}

.tab-btn.active-loading::after {
  content: " ⏳";
  animation: blink 1s infinite;
}

.tab-btn.active-ready {
  background: linear-gradient(180deg, rgba(34,197,94,0.18), rgba(34,197,94,0.10));
  border-color: rgba(34,197,94,0.45);
}

@keyframes blink {
  0%,100% { opacity: 1; }
  50% { opacity: 0.3; }
}

    .viewer-shell {
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(0,0,0,0.35);
  backdrop-filter: blur(12px);
  box-shadow: 0 14px 60px rgba(0,0,0,0.35);
  overflow: visible;
  min-height: 0;
  position: relative;
}

    .home-panel {
      min-height: 980px;
      display: grid;
      place-items: center;
      padding: 40px;
    }

    .home-card {
  width: 100%;
  max-width: 680px; /* più stretta */
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.10);
  background:
    linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
  box-shadow: 0 10px 30px rgba(0,0,0,0.30);

  padding: 20px; /* meno spazio */
  display: grid;
  gap: 12px;
  justify-items: center;
  text-align: center;
}

    .home-card img {
  max-width: 100%;
  height: auto;
  max-height: 140px; /* prima era ~220 */
  filter:
    drop-shadow(0 0 14px rgba(255,215,0,0.35))
    drop-shadow(0 0 22px rgba(255,215,0,0.18));
}

    .home-card-title {
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  line-height: 1.2;

  text-shadow:
    0 0 10px rgba(255,215,0,0.25),
    0 0 18px rgba(160,90,255,0.18);
}

     .home-card.fade-out {
  opacity: 0;
  transform: translateY(-10px);
  transition: opacity 1.6s ease, transform 0.8s ease;
}

    .home-card-text {
      font-size: 14px;
      line-height: 1.55;
      opacity: 0.82;
      max-width: 760px;
    }

    .booting-panel {
      display: grid;
      place-items: center;
      min-height: 980px;
      padding: 40px;
    }

    .booting-card {
      width: 100%;
      max-width: 760px;
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,0.10);
      background:
        linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
      box-shadow: 0 12px 40px rgba(0,0,0,0.30);
      padding: 28px;
      display: grid;
      gap: 18px;
      text-align: center;
      justify-items: center;
    }

    .booting-title {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }

    .booting-text {
      font-size: 13px;
      line-height: 1.55;
      opacity: 0.8;
      max-width: 560px;
    }

    .booting-bar {
      position: relative;
      width: 100%;
      max-width: 360px;
      height: 12px;
      border-radius: 999px;
      background: rgba(255,255,255,0.06);
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.10);
      box-shadow: inset 0 0 14px rgba(0,0,0,0.25);
    }

    .booting-bar::before {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      left: -35%;
      width: 35%;
      border-radius: 999px;
      background:
        linear-gradient(90deg, rgba(255,215,0,0.95), rgba(220,220,220,0.95), rgba(160,90,255,0.95));
      box-shadow:
        0 0 18px rgba(255,215,0,0.25),
        0 0 22px rgba(160,90,255,0.18);
      animation: portalLoadSlide 2.8s ease-in-out infinite;
    }

    .booting-bar::after {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      left: -20%;
      width: 20%;
      border-radius: 999px;
      background:
        linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.42), rgba(255,255,255,0));
      filter: blur(2px);
      animation: portalLoadShine 2.8s ease-in-out infinite;
    }

    .movements-wrap {
      display: none;
      width: 100%;
      justify-content: flex-end;
      padding: 14px 14px 0 14px;
      background: rgba(0,0,0,0.10);
    }

    .movements-wrap.visible {
      display: flex;
    }

    .movements-details {
      width: 100%;
      max-width: 660px;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(255,255,255,0.04);
      box-shadow: 0 10px 30px rgba(0,0,0,0.22);
      overflow: hidden;
    }

    .movements-summary {
  list-style: none;
  cursor: pointer;
  padding: 20px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  font-size: 18px;
  font-weight: 900;
  letter-spacing: 0.7px;
  text-transform: uppercase;
  color: white;

  border-radius: 16px;

  background:
    linear-gradient(90deg,
      rgba(34,197,94,0.22),
      rgba(255,215,0,0.18),
      rgba(239,68,68,0.22)
    );

  border: 1px solid rgba(255,255,255,0.12);

  box-shadow:
    0 0 25px rgba(255,215,0,0.10),
    inset 0 0 20px rgba(255,255,255,0.05);

  transition: all 0.2s ease;
}

.movements-summary:hover {
  transform: scale(1.015);
  box-shadow:
    0 0 35px rgba(255,215,0,0.18),
    inset 0 0 25px rgba(255,255,255,0.08);
}

.movements-content {
  padding: 18px;
  display: grid;
  gap: 6px;
}

.movements-row {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 14px;
  align-items: start;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.movements-label-promote {
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.45px;
  text-transform: uppercase;
  color: #22c55e;
  padding-top: 2px;
}

.movements-label-relegate {
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.45px;
  text-transform: uppercase;
  color: #ef4444;
  padding-top: 2px;
}

.movements-list {
  display: grid;
  gap: 7px;
}

.movements-item {
  font-size: 14px;
  line-height: 1.45;
  color: rgba(255,255,255,0.88);
  font-weight: 700;
}

.movements-empty {
  font-size: 14px;
  line-height: 1.45;
  color: rgba(255,255,255,0.84);
}

.movements-note {
  padding-top: 12px;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(255,255,255,0.72);
}

    .iframe-wrap {
  display: none;
  width: 100%;
  min-height: 0;
  background: transparent;
  padding: 14px 14px 0 14px;
}

    .iframe-wrap.visible {
      display: block;
    }

    #leagueFrame {
  width: 100%;
  display: block;
}

    .footer {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      padding: 6px 4px 0 4px;
      font-size: 12px;
      color: rgba(255,255,255,0.58);
      letter-spacing: 0.2px;
    }

    @keyframes portalLoadSlide {
      0% { left: -35%; }
      50% { left: 100%; }
      100% { left: -35%; }
    }

    @keyframes portalLoadShine {
      0% { left: -20%; }
      50% { left: 100%; }
      100% { left: -20%; }
    }

    @media (min-width: 701px) {
  .home-panel,
  .booting-panel {
    min-height: 360px;
    place-items: start center;
    padding: 34px 40px 40px 40px;
  }

  .home-card,
  .booting-card {
    margin-top: 0;
  }
}
    
@media (min-width: 701px) {
  .movements-wrap {
    justify-content: flex-start;
    padding-left: 18px;
  }
}

@media (max-width: 1100px) {
      body {
        padding: 14px;
      }

      .shell {
        gap: 14px;
      }

      .hero {
        padding: 16px;
        gap: 14px;
      }

      .hero-top {
        align-items: flex-start;
      }

      .hero-title {
        font-size: 28px;
      }

      .hero-subtitle {
        font-size: 13px;
      }

      .viewer-shell {
        min-height: auto;
      }

      .home-panel,
      .booting-panel {
        min-height: auto;
        padding: 22px 14px;
      }

      .iframe-wrap {
        min-height: auto;
        padding: 10px;
      }
    }

    @media (max-width: 700px) {
  html,
  body {
    width: 100%;
    min-width: 0;
    overflow-x: auto;
    overflow-y: auto;
  }

  body {
    padding: 10px;
  }

  .shell {
    width: 1260px;
    min-width: 1260px;
    max-width: none;
    margin: 0;
  }

  .hero {
    padding: 14px;
    border-radius: 18px;
  }

  .hero-title {
    font-size: 22px;
    line-height: 1.08;
  }

  .hero-subtitle {
    font-size: 12px;
  }

  .hero-badge {
    font-size: 11px;
    padding: 6px 10px;
  }

  .hero-logo img {
    height: 82px;
  }

  .tabs {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 10px;
  }

  .tab-btn {
    padding: 13px 12px;
    font-size: 11px;
  }

  .viewer-shell {
    width: 1260px;
    min-width: 1260px;
    max-width: none;
    overflow: visible;
    border-radius: 18px;
  }

  .iframe-wrap {
    width: 1260px;
    min-width: 1260px;
    max-width: none;
    padding: 8px;
    overflow: visible;
  }

  #leagueFrame {
    width: 1260px !important;
    min-width: 1260px !important;
    display: block;
  }

  .home-panel,
  .booting-panel {
    padding: 16px 10px;
  }

  .home-card,
  .booting-card {
    padding: 18px 14px;
    border-radius: 18px;
  }

  .home-card-title,
  .booting-title {
    font-size: 22px;
  }

  .home-card-text,
  .booting-text {
    font-size: 13px;
  }

  .movements-wrap {
    padding: 10px 10px 0 10px;
  }

  .movements-row {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .footer {
    font-size: 11px;
  }
  @media (max-width: 700px) {
  #splashText {
    font-size: 22px;
    letter-spacing: 2px;
  }
}
  /* 🔥 FIX OVERLAP HEADER CLASSIFICA */
  .championship-header,
  .header-top,
  .title-row {
    display: flex;
    flex-wrap: wrap !important;
    gap: 6px;
  }

  .championship-title,
  .header-title {
    white-space: normal !important;
    word-break: break-word;
  }

  .championship-subtitle,
  .header-circuit {
    width: 100%;
    font-size: 11px;
    opacity: 0.8;
  }
}

    @media print {
      html, body {
        background: #0b0d12;
      }

      body {
        padding: 0;
      }

      .shell {
        max-width: none;
        gap: 12px;
      }
    }

    #splashScreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: black;
  display: block;
  overflow: hidden;
}

#splashScreen img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
  opacity: 0;
  animation: splashImageIn 1s ease-out 0.65s forwards;
}

.splash-desktop {
  display: block !important;
}

.splash-mobile {
  display: none !important;
}

@media (orientation: portrait) {
  .splash-desktop {
    display: none !important;
  }

  .splash-mobile {
    display: block !important;
  }
}

#splashText {
  position: absolute;
  bottom: 12%;
  width: 100%;
  text-align: center;
  font-size: 52px;
  font-weight: 900;
  letter-spacing: 3px;
  color: white;
  font-family: 'Orbitron', sans-serif;
  z-index: 3;

  opacity: 0;
  transform: translateY(26px);

  text-shadow:
    0 0 12px rgba(255,215,0,0.95),
    0 0 28px rgba(255,215,0,0.55),
    0 0 46px rgba(0,0,0,0.9);

  animation: splashTextIn 2.4s ease-out 0.05s forwards;
}

#splashSubText {
  position: absolute;
  bottom: 4%;
  width: 100%;
  text-align: center;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 2.5px;
  opacity: 0;
  color: rgba(255,255,255,0.95);
  font-family: 'Orbitron', sans-serif;
  z-index: 3;

  text-shadow:
    0 0 8px rgba(255,255,255,0.75),
    0 0 16px rgba(255,215,0,0.55);

  animation: splashTextIn 1.4s ease-out 0.15s forwards;
}

#splashHint {
  display: block;
  font-size: 24px; /* più grande */
  margin-top: 14px;
  color: black; /* testo nero pieno */
  font-weight: 900;
  letter-spacing: 1.8px;
  text-align: center;

  /* 🔥 contorno bianco + glow oro */
  text-shadow:
    /* contorno bianco netto */
    1px 1px 0 white,
    -1px 1px 0 white,
    1px -1px 0 white,
    -1px -1px 0 white,

    /* glow bianco base */
    0 0 6px rgba(255,255,255,1),
    0 0 12px rgba(255,255,255,0.9),

    /* glow oro forte */
    0 0 18px rgba(255,215,0,0.9),
    0 0 30px rgba(255,215,0,0.7),
    0 0 46px rgba(255,215,0,0.5);

  animation: splashHintGlow 1.6s ease-in-out infinite;
}

@media (max-width: 700px) {
  #splashHint {
    font-size: 20px;
    padding: 0 12px;
  }
}

@keyframes splashHintGlow {
  0% {
    opacity: 0.7;
    text-shadow:
      0 0 4px rgba(255,255,255,0.6),
      0 0 8px rgba(255,215,0,0.4);
  }

  50% {
    opacity: 1;
    text-shadow:
      0 0 10px rgba(255,255,255,1),
      0 0 18px rgba(255,215,0,0.9);
  }

  100% {
    opacity: 0.7;
    text-shadow:
      0 0 4px rgba(255,255,255,0.6),
      0 0 8px rgba(255,215,0,0.4);
  }
}

@keyframes splashTextIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes splashImageIn {
  to {
    opacity: 1;
  }
}
  </style>
</head>
<body>
<div id="splashScreen">
  <img
    class="splash-desktop"
    src="${splashDataUrl}"
    alt="PRT Splash Desktop"
  />

  <img
    class="splash-mobile"
    src="${splashMobileDataUrl || splashDataUrl}"
    alt="PRT Splash Mobile"
  />

  <div id="splashText">POISON RACING TEAM</div>
<div id="splashSubText">
  IN CARICAMENTO<span id="splashDots"></span>
  <br />
  <span id="splashHint">l'attesa potrebbe durare fino a 60 secondi</span>
</div>
</div>
  <div class="shell">
    <div class="hero">
  <div class="hero-top">
    <div class="hero-title-wrap">
      <div class="hero-badge">PRT Season 2K26</div>
      <div class="hero-title">Portale Classifiche PRT</div>
      <div class="hero-subtitle">
        Seleziona dai pannelli sottostanti la classifica assoluta di lega oppure la classifica della singola gara.
      </div>
    </div>

    <div class="hero-logo">
      ${logoDataUrl ? `<img src="${logoDataUrl}" alt="PRT Logo" />` : ""}
    </div>
  </div>
</div>

<div class="race-png-panel">
  <div>
    <div class="race-png-title">Classifiche Assolute S2K26</div>
    <div style="font-size:12px; opacity:0.72; margin-top:4px;">
      Seleziona una lega per aprire la relativa classifica assoluta.
    </div>
  </div>

  <div class="tabs" id="tabs">
    ${tabsHtml}
  </div>
</div>

<div class="race-png-panel">
  <div class="race-png-head">
  <div class="race-png-title">Classifiche Gara</div>

  <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-top:6px;">
    <div style="font-size:13px; opacity:0.82; font-weight:700;">
      Seleziona Gara (1–13)
    </div>

    <select class="race-png-select" id="racePngSelect">
        <option value="1">Gara 1</option>
        <option value="2">Gara 2</option>
        <option value="3">Gara 3</option>
        <option value="4">Gara 4</option>
        <option value="5">Gara 5</option>
        <option value="6">Gara 6</option>
        <option value="7">Gara 7</option>
        <option value="8">Gara 8</option>
        <option value="9">Gara 9</option>
        <option value="10">Gara 10</option>
        <option value="11">Gara 11</option>
        <option value="12">Gara 12</option>
        <option value="13">Gara 13</option>
      </select>
    </div>
  </div>

  <div class="race-png-tabs" id="racePngTabs"></div>

  <div class="race-png-viewer" id="racePngViewer">
    <img id="racePngImage" src="" alt="Classifica gara" />
  </div>
</div>

    <div class="viewer-shell">
      <div class="booting-panel" id="bootingPanel">
        <div class="booting-card">
          <div class="booting-title">Preparazione portale</div>

<div
  style="
    font-size: 18px;
    font-weight: 900;
    letter-spacing: 0.35px;
    text-transform: uppercase;
    line-height: 1.15;
    opacity: 0.92;
  "
>
  Il caricamento può richiedere fino a 30 secondi
</div>

<div class="booting-bar"></div>

<div class="booting-text">
  Le leghe saranno visibili subito dopo il caricamento.
  Il portale sta inizializzando i contenuti HTML salvati.
</div>
        </div>
      </div>

      <div class="home-panel" id="homePanel" style="display:grid;">
        <div class="home-card">
          ${logoDataUrl ? `<img src="${logoDataUrl}" alt="PRT Logo" />` : ""}
          <div class="home-card-title">ADESSO PUOI SELEZIONARE UNA LEGA</div>
        </div>
      </div>

      <div class="movements-wrap" id="movementsWrap"></div>

      <div class="iframe-wrap" id="iframeWrap">
  <div id="leagueFrame"></div>
</div>
    </div>
  </div>

  <script>
    const pages = ${pagesJson};
    const movementSummaryByLeague = ${movementSummaryJson};
    const isMovementRoundForHtml = ${isMovementRoundForHtml ? "true" : "false"};
    const orderedLeagues = ["ELITE", "PLATINUM", "MASTER", "PRO", "GT"];

    const tabs = document.getElementById("tabs");
    const frame = document.getElementById("leagueFrame");
    const homePanel = document.getElementById("homePanel");
    const iframeWrap = document.getElementById("iframeWrap");
    const movementsWrap = document.getElementById("movementsWrap");
    const bootingPanel = document.getElementById("bootingPanel");
    const racePngSelect = document.getElementById("racePngSelect");
const racePngTabs = document.getElementById("racePngTabs");
const racePngViewer = document.getElementById("racePngViewer");
const racePngImage = document.getElementById("racePngImage");

let selectedRacePng = "4";

function renderRacePngTabs() {
  if (!racePngTabs) return;

  racePngTabs.innerHTML = "";

  const raceLeagues =
    selectedRacePng === "1"
      ? ["ELITE", "PLATINUM", "MASTER", "PRO", "GT", "AMA"]
      : orderedLeagues;

  raceLeagues.forEach(function(league) {
    const btn = document.createElement("button");
    btn.className = "tab-btn saved preloaded";
    btn.type = "button";
    btn.textContent = league + " G" + selectedRacePng;

    btn.addEventListener("click", function() {
      openRacePng(league);
    });

    racePngTabs.appendChild(btn);
  });
}

function openRacePng(league) {
  if (!racePngImage || !racePngViewer || !racePngTabs) return;

  const src = "/Gare/G" + selectedRacePng + "/" + league + ".png";

  const allTabs = racePngTabs.querySelectorAll("button");

  allTabs.forEach(function(btn) {
    btn.classList.remove("active-loading", "active-ready");
  });

  const activeBtn = Array.from(allTabs).find(function(btn) {
    return btn.textContent.includes(league);
  });

  if (activeBtn) {
    activeBtn.classList.add("active-loading");
  }

  racePngImage.src = "";
  racePngImage.alt = "Classifica Gara " + selectedRacePng + " " + league;

  racePngViewer.classList.add("visible");
  racePngViewer.classList.add("loading");

  const img = new Image();

  img.onload = function() {
    racePngImage.src = src;
    racePngViewer.classList.remove("loading");

    if (activeBtn) {
      activeBtn.classList.remove("active-loading");
      activeBtn.classList.add("active-ready");
    }
  };

  img.onerror = function() {
    racePngViewer.classList.remove("loading");

    if (activeBtn) {
      activeBtn.classList.remove("active-loading");
    }
  };

  img.src = src;

  // Chiude eventuale classifica assoluta aperta
activeLeague = null;
renderTabs();

if (iframeWrap) {
  iframeWrap.classList.remove("visible");
}

if (frame) {
  frame.innerHTML = "";
}

if (movementsWrap) {
  movementsWrap.classList.remove("visible");
  movementsWrap.innerHTML = "";
}
  
  if (bootingPanel) bootingPanel.style.display = "none";
  if (homePanel) homePanel.style.display = "none";
}

if (racePngSelect) {
  racePngSelect.value = selectedRacePng;

  racePngSelect.addEventListener("change", function() {
    selectedRacePng = racePngSelect.value;
    renderRacePngTabs();

    if (racePngImage) racePngImage.src = "";
    if (racePngViewer) {
  racePngViewer.classList.remove("visible");
  racePngViewer.classList.remove("loading");
}
  });
}

renderRacePngTabs();

    let activeLeague = null;

    function escapeHtml(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function finishBoot() {
  if (bootingPanel) {
    bootingPanel.style.display = "none";
  }

  if (homePanel && !activeLeague) {
    homePanel.style.display = "grid";
  }
}

    function renderLeagueMovements(league) {
  if (!movementsWrap) return;

  if (!isMovementRoundForHtml) {
    movementsWrap.classList.remove("visible");
    movementsWrap.innerHTML = "";
    return;
  }

  const summary = movementSummaryByLeague[league] || {
    promotions: [],
    relegations: [],
  };

  const hasPromotions = Array.isArray(summary.promotions) && summary.promotions.length > 0;
  const hasRelegations = Array.isArray(summary.relegations) && summary.relegations.length > 0;
  const hasMovements = hasPromotions || hasRelegations;

  let inner = "";
  inner += '<details class="movements-details">';
  inner += '<summary class="movements-summary">';
  inner += '<span><span style="color:#22c55e;">PROMOZIONI</span> - <span style="color:#ef4444;">RETROCESSIONI</span></span>';
  inner += '<span style="opacity:0.78; font-size:12px;">Tap / Click</span>';
  inner += "</summary>";
  inner += '<div class="movements-content">';

  if (hasPromotions) {
    inner += '<div class="movements-row">';
    inner += '<div class="movements-label-promote">Promossi</div>';
    inner += '<div class="movements-list">';

    summary.promotions.forEach(function(item) {
      inner += '<div class="movements-item">' + escapeHtml(item) + "</div>";
    });

    inner += "</div>";
    inner += "</div>";
  }

  if (hasRelegations) {
    inner += '<div class="movements-row">';
    inner += '<div class="movements-label-relegate">Retrocessi</div>';
    inner += '<div class="movements-list">';

    summary.relegations.forEach(function(item) {
      inner += '<div class="movements-item">' + escapeHtml(item) + "</div>";
    });

    inner += "</div>";
    inner += "</div>";
  }

  if (!hasMovements) {
    inner += '<div class="movements-empty">';
    inner += "Nessuna promozione o retrocessione per questa lega.";
    inner += "</div>";
  }

  inner += '<div class="movements-note">';
  inner += "Questo TAB visualizza eventuali piloti promossi o retrocessi collegati a questa Lega. ";
  inner += "Promo: 60% dei punti del blocco delle 3 gare precedenti. Retro: 150% dei punti del blocco delle 3 gare precenti - come da regolamento.";
  inner += "</div>";

  inner += "</div>";
  inner += "</details>";

  movementsWrap.innerHTML = inner;
  movementsWrap.classList.add("visible");
}

    function renderTabs() {
      const existingButtons = tabs.querySelectorAll("[data-league]");

      existingButtons.forEach(function(btn) {
        const league = btn.getAttribute("data-league");
        const hasPage = !!(pages[league] && String(pages[league]).trim());

        btn.className =
          "tab-btn" +
          (hasPage ? " saved preloaded" : "") +
          (activeLeague === league ? " active" : "");

        const isLoaded = !!frame.srcdoc && activeLeague === league;

btn.innerHTML = hasPage
  ? league + ' <span class="tab-check">✓</span>'
  : league + ' <span class="tab-missing">—</span>';
        btn.disabled = !hasPage;
        btn.title = hasPage ? "Apri " + league : league + " non salvata";

        if (hasPage && !btn.dataset.bound) {
          btn.addEventListener("click", function() {
            openLeague(league);
          });
          btn.dataset.bound = "true";
        }
      });
    }

    function openLeague(league) {
      if (!pages[league]) return;

      activeLeague = league;
      renderTabs();
      // Chiude eventuale classifica gara PNG aperta
if (racePngViewer) {
  racePngViewer.classList.remove("visible");
  racePngViewer.classList.remove("loading");
}

if (racePngImage) {
  racePngImage.src = "";
}

if (racePngTabs) {
  racePngTabs.querySelectorAll("button").forEach(function(btn) {
    btn.classList.remove("active-loading", "active-ready");
  });
}

      if (bootingPanel) {
        bootingPanel.style.display = "none";
      }

      homePanel.style.display = "none";
      iframeWrap.classList.add("visible");
      const parser = new DOMParser();
const parsed = parser.parseFromString(pages[league], "text/html");

const styles = Array.from(parsed.head.querySelectorAll("style"))
  .map((style) => style.outerHTML)
  .join("");

const bodyContent = parsed.body.innerHTML;

frame.innerHTML = styles + bodyContent;

if (window.matchMedia("(max-width: 700px)").matches) {
  const allNodes = Array.from(frame.querySelectorAll("*"));

  const seasonNode = allNodes.find((el) => {
    const text = (el.textContent || "").trim().toUpperCase();
    return text === "PRT SEASON 2K26";
  });

  if (seasonNode) {
    let row = seasonNode.parentElement;

    for (let i = 0; i < 8 && row; i++) {
      const children = Array.from(row.children);
      const rowText = (row.textContent || "").toUpperCase();

      if (
        children.length >= 2 &&
        rowText.includes("PRT SEASON 2K26")
      ) {
        row.style.setProperty("display", "grid", "important");
        row.style.setProperty("grid-template-columns", "1fr", "important");
        row.style.setProperty("gap", "8px", "important");
        row.style.setProperty("align-items", "start", "important");
        row.style.setProperty("justify-content", "start", "important");

        children.forEach((child) => {
          child.style.setProperty("width", "100%", "important");
          child.style.setProperty("max-width", "100%", "important");
          child.style.setProperty("white-space", "normal", "important");
          child.style.setProperty("text-align", "left", "important");
        });

        break;
      }

      row = row.parentElement;
    }
  }
}

document.title = "PRT Season 2K26 - " + league;

renderLeagueMovements(league);
    }

    renderTabs();

    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(function() {
        window.requestAnimationFrame(function() {
          finishBoot();
        });
      });
    } else {
      setTimeout(finishBoot, 80);
    }

// SPLASH SCREEN

const splashDots = document.getElementById("splashDots");

let dots = 0;

function animateDots() {
  if (!splashDots) return;

  dots = (dots + 1) % 4;
  splashDots.textContent = ".".repeat(dots);

  setTimeout(animateDots, 500);
}

animateDots();

setTimeout(() => {
  const splash = document.getElementById("splashScreen");
  if (splash) splash.style.display = "none";
}, 8000);
  </script>
</body>
</html>`

  const blob = new Blob([html], { type: "text/html;charset=utf-8" })
  const url = URL.createObjectURL(blob)

  try {
    const a = document.createElement("a")
    a.href = url
    a.download = "prt_s2k26_portale_generale.html"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function openExportModal(type: "png" | "championship-html") {
  setExportTextsDraft(exportTexts)
  setPendingHeaderExportType(type)
  setShowExportModal(true)
}

  async function confirmHeaderExport() {
  const nextTexts = {
    mainTitle: (exportTextsDraft.mainTitle || "ALBIXXIMO RACE TOOL").trim(),
    sideLabel: (exportTextsDraft.sideLabel || "RACE CSV EXTRACTOR").trim(),
    subtitle: (exportTextsDraft.subtitle || "PRT Timing Assistant").trim(),
  }

  setExportTexts(nextTexts)
  setShowExportModal(false)

  await new Promise((resolve) => setTimeout(resolve, 80))

  if (pendingHeaderExportType === "png") {
    await performExportTablePng()
  } else if (pendingHeaderExportType === "championship-html") {
    await downloadChampionshipHtmlExport()
  }

  setPendingHeaderExportType(null)
}

function handleGenerateExtractionClick() {
  if (loading || !canRun) return

  if (savedLeagueInCurrentRace) {
    setError(`La lega ${selectedLeague} per Gara ${currentRace} è già salvata. Aprila o resettala prima di generare una nuova estrazione.`)
    return
  }

  setManualLegaOverride(selectedLeague)
  run(selectedLeague)
}  

async function run(targetLeague?: ChampionshipLeagueKey) {
  setLoading(true)
  setError("")
  setCsv("")
  setRows([])
  setQualiRows([])
  setUnionMeta({ gara: "", lobby: "", lega: "" })
  setManualGaraOverride("")
  setManualLegaOverride("")

  setPenalties({})
  setLapOverrides({})
  setDnfOverrides({})

  setManualPilotOverrides({})
  setManualAutoOverrides({})
  setManualDistaccoOverrides({})
  setManualQualiOverrides({})

  setManualPilotDraft({})
  setManualAutoDraft({})
  setManualDistaccoDraft({})
  setManualQualiDraft({})

  setShowPilotModal(false)
  setShowAutoModal(false)
  setShowDistaccoModal(false)
  setShowQualiModal(false)

  try {
    const fd = new FormData()
    for (const f of files) fd.append("files", f)

    const res = await fetch("/api/albixximo", { method: "POST", body: fd })
    const data = await res.json()

    if (!res.ok) {
      setError(JSON.stringify(data, null, 2))
    } else {
      setCsv(data.csv || "")

const extractedRows: ExtractRow[] = Array.isArray(data.rows)
  ? data.rows
  : []

const extractedQualiRows: QualiRow[] = Array.isArray(data.qualiRows)
  ? data.qualiRows
  : []

const nextUnionMeta =
  data.unionMeta && typeof data.unionMeta === "object"
    ? {
        gara: data.unionMeta.gara || "",
        lobby: data.unionMeta.lobby || "",
        lega: data.unionMeta.lega || "",
      }
    : { gara: "", lobby: "", lega: "" }

setUnionMeta(nextUnionMeta)

const detectedLeague = normalizeLeagueKey(nextUnionMeta.lega)

const effectiveImportLeague =
  targetLeague || detectedLeague || selectedLeague

let rowsWithAliases = extractedRows

const aliasMapForLeague =
  driverAliasMap[effectiveImportLeague] || {}

for (const [rawAliasKey, officialName] of Object.entries(aliasMapForLeague)) {
  const official = String(officialName)

  const quali = extractedQualiRows.find(
    (q: QualiRow) => normalizeDriverLookupName(q.pilota) === rawAliasKey
  )

  if (quali) {
    rowsWithAliases = applyQualiRaceAliasToRows(
      rowsWithAliases,
      extractedQualiRows,
      quali.pilota,
      official
    )
  }

  rowsWithAliases = rowsWithAliases.map((row: ExtractRow) => {
    const rowKey = normalizeDriverLookupName(row.pilota)

    if (rowKey !== rawAliasKey) return row

    return {
      ...row,
      pilota: official,
    }
  })
}

setRows(rowsWithAliases)
setQualiRows(extractedQualiRows)

      if (effectiveImportLeague) {
        setSelectedLeague(effectiveImportLeague)
        setManualLegaOverride(effectiveImportLeague)
      }

      setWorkbenchDriverLeagueMap((prev) => {
        const hasWorkbenchData = CHAMPIONSHIP_LEAGUES.some(
          (league) => (prev[league] || []).length > 0
        )

        return hasWorkbenchData
          ? prev
          : cloneDriverLeagueMap(driverLeagueMap)
      })
    }
  } catch (e: any) {
    setError(String(e?.message || e))
  } finally {
    setLoading(false)
  }
}

  function clearCurrentWorkbench(keepSelectedLeague = true) {
  if (fileInputRef.current) {
    fileInputRef.current.value = ""
  }

  setFiles([])
  setCsv("")
  setRows([])
  setQualiRows([])
  setUnionMeta({ gara: "", lobby: "", lega: "" })
  setLoading(false)
  setExporting(false)
  setError("")
  setShowTable(true)
  setShowReq(false)
  setPenalties({})
  setExportMetaInPng(false)
  setLapOverrides({})
  setDnfOverrides({})
  setShowExportModal(false)
  setManualGaraOverride("")
  setManualLegaOverride(keepSelectedLeague ? selectedLeague : "")
  setManualPilotOverrides({})
  setManualAutoOverrides({})
  setManualDistaccoOverrides({})
  setManualPilotDraft({})
  setManualAutoDraft({})
  setManualDistaccoDraft({})
  setShowPilotModal(false)
  setShowAutoModal(false)
  setShowDistaccoModal(false)
  setShowConfirmSaveLeagueModal(false)
  setShowSaveLeagueSuccessModal(false)
  setShowConfirmResetRaceModal(false)
  setUnknownDriverSelections({})
  setDismissedUnknownDrivers({})
}
  
  function resetAll() {
  clearCurrentWorkbench(true)
}

function exportChampionshipBackup() {
  try {
    const backup: BackupFile = {
  version: 1,
  savedAt: new Date().toISOString(),
  championshipState,
  currentRace,
  selectedLeague,
  exportTexts,
  driverBaselines,
  manualRace12Draft,
  driverLeagueMap: workbenchDriverLeagueMap,
  driverAliasMap,
  driverRatingMap,
  uploadedLeagueHtmls,
}

    const json = JSON.stringify(backup, null, 2)

    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = `albixximo_prt_backup_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}.json`

    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    URL.revokeObjectURL(url)
  } catch (err) {
    console.error("Errore export backup:", err)
    setError("Errore durante l'esportazione del backup")
  }
}

async function importLeagueHtmlFiles(filesList: FileList | File[]) {
  const filesArray = Array.from(filesList || [])
  if (!filesArray.length) return

  const next: Partial<Record<ChampionshipLeagueKey, string>> = {}

  for (const file of filesArray) {
    try {
      const text = await file.text()
      const upperName = file.name.toUpperCase()

      let detectedLeague: ChampionshipLeagueKey | null = null

      if (upperName.includes("ELITE")) detectedLeague = "ELITE"
      else if (upperName.includes("PLATINUM")) detectedLeague = "PLATINUM"
      else if (upperName.includes("MASTER")) detectedLeague = "MASTER"
      else if (upperName.includes("PRO")) detectedLeague = "PRO"
      else if (upperName.includes("GT")) detectedLeague = "GT"

      if (!detectedLeague) {
        const htmlUpper = text.toUpperCase()

        if (htmlUpper.includes("LEGA ELITE")) detectedLeague = "ELITE"
        else if (htmlUpper.includes("LEGA PLATINUM")) detectedLeague = "PLATINUM"
        else if (htmlUpper.includes("LEGA MASTER")) detectedLeague = "MASTER"
        else if (htmlUpper.includes("LEGA PRO")) detectedLeague = "PRO"
        else if (htmlUpper.includes("LEGA GT")) detectedLeague = "GT"
      }

      if (detectedLeague) {
        next[detectedLeague] = text
      }
    } catch {
      // ignora file illeggibili
    }
  }

  setUploadedLeagueHtmls((prev) => ({
    ...prev,
    ...next,
  }))
}

async function importChampionshipBackup(file: File) {
  try {
    const text = await file.text()
    const parsed = JSON.parse(text) as BackupFile

    // Validazione base
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.championshipState ||
      typeof parsed.championshipState.races !== "object"
    ) {
      throw new Error("Backup non valido")
    }

    const race = Number(parsed.currentRace)
    if (!race || race < 1 || race > 13) {
      throw new Error("Numero gara non valido nel backup")
    }

    const league = normalizeLeagueKey(parsed.selectedLeague)
    if (!league) {
      throw new Error("Lega non valida nel backup")
    }

    // Applica stato
setChampionshipState(parsed.championshipState)
setCurrentRace(race)
setSelectedLeague(league)

if (parsed.exportTexts) {
  setExportTexts(parsed.exportTexts)
}

setDriverBaselines(
  Array.isArray(parsed.driverBaselines) ? parsed.driverBaselines : []
)

setManualRace12Draft(
  parsed.manualRace12Draft && typeof parsed.manualRace12Draft === "object"
    ? parsed.manualRace12Draft
    : {}
)

const importedDriverLeagueMap: DriverLeagueMap =
  parsed.driverLeagueMap && typeof parsed.driverLeagueMap === "object"
    ? {
        ELITE: Array.isArray(parsed.driverLeagueMap.ELITE) ? parsed.driverLeagueMap.ELITE : [],
        PLATINUM: Array.isArray(parsed.driverLeagueMap.PLATINUM) ? parsed.driverLeagueMap.PLATINUM : [],
        MASTER: Array.isArray(parsed.driverLeagueMap.MASTER) ? parsed.driverLeagueMap.MASTER : [],
        PRO: Array.isArray(parsed.driverLeagueMap.PRO) ? parsed.driverLeagueMap.PRO : [],
        GT: Array.isArray(parsed.driverLeagueMap.GT) ? parsed.driverLeagueMap.GT : [],
      }
    : {
        ELITE: [],
        PLATINUM: [],
        MASTER: [],
        PRO: [],
        GT: [],
      }

setDriverLeagueMap(importedDriverLeagueMap)
setWorkbenchDriverLeagueMap(cloneDriverLeagueMap(importedDriverLeagueMap))

setDriverAliasMap(
  parsed.driverAliasMap && typeof parsed.driverAliasMap === "object"
    ? {
        ELITE: parsed.driverAliasMap.ELITE && typeof parsed.driverAliasMap.ELITE === "object" ? parsed.driverAliasMap.ELITE : {},
        PLATINUM: parsed.driverAliasMap.PLATINUM && typeof parsed.driverAliasMap.PLATINUM === "object" ? parsed.driverAliasMap.PLATINUM : {},
        MASTER: parsed.driverAliasMap.MASTER && typeof parsed.driverAliasMap.MASTER === "object" ? parsed.driverAliasMap.MASTER : {},
        PRO: parsed.driverAliasMap.PRO && typeof parsed.driverAliasMap.PRO === "object" ? parsed.driverAliasMap.PRO : {},
        GT: parsed.driverAliasMap.GT && typeof parsed.driverAliasMap.GT === "object" ? parsed.driverAliasMap.GT : {},
      }
    : {
        ELITE: {},
        PLATINUM: {},
        MASTER: {},
        PRO: {},
        GT: {},
      }
)

setDriverRatingMap(
  parsed.driverRatingMap && typeof parsed.driverRatingMap === "object"
    ? parsed.driverRatingMap
    : {}
)

setUploadedLeagueHtmls(
  parsed.uploadedLeagueHtmls && typeof parsed.uploadedLeagueHtmls === "object"
    ? parsed.uploadedLeagueHtmls
    : {}
)

    // Reset workbench (pulizia UI)
    clearCurrentWorkbench(false)
    setUnknownDriverSelections({})
    setDismissedUnknownDrivers({})

  } catch (err) {
    console.error("Errore import backup:", err)
    setError("Backup JSON non valido o corrotto")
  }
}

function handleSelectLeague(league: ChampionshipLeagueKey) {
  setUnknownDriverSelections({})
  setDismissedUnknownDrivers({})

  const snapshot = currentRaceSnapshot[league]

  if (snapshot) {
    reopenSavedLeague(league)
    return
  }

  clearCurrentWorkbench(false)

  setSelectedLeague(league)
  setManualLegaOverride(league)
}

function applyBulkPilotsToLeagueDrawer(league: ChampionshipLeagueKey) {
  const raw = String(drawerBulkDrafts[league] || "").trim()
  if (!raw) return

  const parsedPilots = raw
    .split(/\r?\n/)
    .map((line) => String(line || "").trim())
    .filter(Boolean)

  const uniquePilots: string[] = []
  const seen = new Set<string>()

  for (const pilot of parsedPilots) {
    const normalized = normalizeDriverNameForChampionship(pilot)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    uniquePilots.push(pilot)
  }

  setWorkbenchDriverLeagueMap((prev) => {
    const next: DriverLeagueMap = {
      ELITE: [...prev.ELITE],
      PLATINUM: [...prev.PLATINUM],
      MASTER: [...prev.MASTER],
      PRO: [...prev.PRO],
      GT: [...prev.GT],
    }

    const incomingSet = new Set(
      uniquePilots.map((pilot) => normalizeDriverNameForChampionship(pilot))
    )

    for (const currentLeague of CHAMPIONSHIP_LEAGUES) {
      next[currentLeague] = next[currentLeague].filter(
        (pilot) => !incomingSet.has(normalizeDriverNameForChampionship(pilot))
      )
    }

    next[league] = [...uniquePilots].sort((a, b) =>
      a.localeCompare(b, "it", { sensitivity: "base" })
    )

    return next
  })

  setDrawerBulkDrafts((prev) => ({
    ...prev,
    [league]: "",
  }))
}

function addPilotToLeagueDrawer(league: ChampionshipLeagueKey) {
  const rawName = String(drawerDrafts[league] || "").trim()
  if (!rawName) return

  const normalized = normalizeDriverNameForChampionship(rawName)

  setWorkbenchDriverLeagueMap((prev) => {
    const next: DriverLeagueMap = {
      ELITE: [...prev.ELITE],
      PLATINUM: [...prev.PLATINUM],
      MASTER: [...prev.MASTER],
      PRO: [...prev.PRO],
      GT: [...prev.GT],
    }

    for (const currentLeague of CHAMPIONSHIP_LEAGUES) {
      next[currentLeague] = next[currentLeague].filter(
        (pilot) => normalizeDriverNameForChampionship(pilot) !== normalized
      )
    }

    next[league].push(rawName)
    next[league].sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" }))

    return next
  })

  setDrawerDrafts((prev) => ({
    ...prev,
    [league]: "",
  }))
}

function removePilotFromLeagueDrawer(
  league: ChampionshipLeagueKey,
  pilotName: string
) {
  const target = normalizeDriverNameForChampionship(pilotName)

  setWorkbenchDriverLeagueMap((prev) => {
    const next: DriverLeagueMap = {
      ELITE: [...prev.ELITE],
      PLATINUM: [...prev.PLATINUM],
      MASTER: [...prev.MASTER],
      PRO: [...prev.PRO],
      GT: [...prev.GT],
    }

    next[league] = next[league].filter(
      (pilot) =>
        normalizeDriverNameForChampionship(pilot) !== target
    )

    return next
  })
}

function removeDsqDriversFromDrawer() {
  if (driversToRemoveAfterDsq.length === 0) return

  const keysToRemove = new Set(
    driversToRemoveAfterDsq.map((driver) =>
      normalizeDriverNameForChampionship(driver.pilota)
    )
  )

  setWorkbenchDriverLeagueMap((prev) => {
    const next: DriverLeagueMap = {
      ELITE: [...prev.ELITE],
      PLATINUM: [...prev.PLATINUM],
      MASTER: [...prev.MASTER],
      PRO: [...prev.PRO],
      GT: [...prev.GT],
    }

    for (const league of CHAMPIONSHIP_LEAGUES) {
      next[league] = next[league].filter(
        (pilot) =>
          !keysToRemove.has(
            normalizeDriverNameForChampionship(pilot)
          )
      )
    }

    return next
  })
}

function addPilotToLeagueDrawerDirect(league: ChampionshipLeagueKey, pilotName: string) {
  const rawName = String(pilotName || "").trim()
  if (!rawName) return

  const normalized = normalizeDriverNameForChampionship(rawName)

  setWorkbenchDriverLeagueMap((prev) => {
    const next: DriverLeagueMap = {
      ELITE: [...prev.ELITE],
      PLATINUM: [...prev.PLATINUM],
      MASTER: [...prev.MASTER],
      PRO: [...prev.PRO],
      GT: [...prev.GT],
    }

    for (const currentLeague of CHAMPIONSHIP_LEAGUES) {
      next[currentLeague] = next[currentLeague].filter(
        (pilot) => normalizeDriverNameForChampionship(pilot) !== normalized
      )
    }

    next[league].push(rawName)
    next[league].sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" }))

    return next
  })
}

function saveDriverAliasForLeague(
  league: ChampionshipLeagueKey,
  rawName: string,
  officialName: string
) {
  const normalizedRaw = normalizeDriverLookupName(rawName)
  const cleanOfficial = String(officialName || "").trim()

  if (!normalizedRaw || !cleanOfficial) return

  setDriverAliasMap((prev) => ({
    ...prev,
    [league]: {
      ...(prev[league] || {}),
      [normalizedRaw]: cleanOfficial,
    },
  }))

  setDismissedUnknownDrivers((prev) => {
    const next = { ...prev }
    delete next[`${league}:${normalizedRaw}`]
    return next
  })
}

function renamePilotInsideLeagueDrawer(
  league: ChampionshipLeagueKey,
  oldPilotName: string,
  newPilotName: string
) {
  const cleanOld = String(oldPilotName || "").trim()
  const cleanNew = String(newPilotName || "").trim()
  if (!cleanOld || !cleanNew) return

  const oldNorm = normalizeDriverNameForChampionship(cleanOld)

  setWorkbenchDriverLeagueMap((prev) => {
    const next: DriverLeagueMap = {
      ELITE: [...prev.ELITE],
      PLATINUM: [...prev.PLATINUM],
      MASTER: [...prev.MASTER],
      PRO: [...prev.PRO],
      GT: [...prev.GT],
    }

    next[league] = next[league]
      .map((pilot) =>
        normalizeDriverNameForChampionship(pilot) === oldNorm ? cleanNew : pilot
      )
      .filter((pilot, index, arr) => {
        const norm = normalizeDriverNameForChampionship(pilot)
        return arr.findIndex((x) => normalizeDriverNameForChampionship(x) === norm) === index
      })
      .sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" }))

    return next
  })

  setDriverAliasMap((prev) => {
    const currentLeagueAliases = { ...(prev[league] || {}) }

    Object.keys(currentLeagueAliases).forEach((aliasKey) => {
      if (currentLeagueAliases[aliasKey] === cleanOld) {
        currentLeagueAliases[aliasKey] = cleanNew
      }
    })

    return {
      ...prev,
      [league]: currentLeagueAliases,
    }
  })
}

function dismissUnknownDriver(league: ChampionshipLeagueKey, rawName: string) {
  const normalizedRaw = normalizeDriverLookupName(rawName)
  if (!normalizedRaw) return

  setDismissedUnknownDrivers((prev) => ({
    ...prev,
    [`${league}:${normalizedRaw}`]: true,
  }))
}

function swapPilotsBetweenLeagues(
  fromLeague: ChampionshipLeagueKey,
  toLeague: ChampionshipLeagueKey,
  pilotName: string,
  targetPilotName: string
) {
  const fromNorm = normalizeDriverNameForChampionship(pilotName)
  const toNorm = normalizeDriverNameForChampionship(targetPilotName)

  setWorkbenchDriverLeagueMap((prev) => {
    const next: DriverLeagueMap = {
      ELITE: [...prev.ELITE],
      PLATINUM: [...prev.PLATINUM],
      MASTER: [...prev.MASTER],
      PRO: [...prev.PRO],
      GT: [...prev.GT],
    }

    // rimuovo entrambi
    next[fromLeague] = next[fromLeague].filter(
      (p) => normalizeDriverNameForChampionship(p) !== fromNorm
    )

    next[toLeague] = next[toLeague].filter(
      (p) => normalizeDriverNameForChampionship(p) !== toNorm
    )

    // li inserisco invertiti
    next[fromLeague].push(targetPilotName)
    next[toLeague].push(pilotName)

    // sort
    for (const league of CHAMPIONSHIP_LEAGUES) {
      next[league].sort((a, b) =>
        a.localeCompare(b, "it", { sensitivity: "base" })
      )
    }

    return next
  })
}

function openConfirmSaveLeagueModal() {
  if (finalRows.length === 0) return

  const mode = savedLeagueInCurrentRace ? "overwrite" : "save"
  setPendingSaveLeagueMode(mode)
  setShowConfirmSaveLeagueModal(true)
}

function confirmSaveCurrentLeague() {
  if (finalRows.length === 0) return

  const saveLeagueKey =
    normalizeLeagueKey(effectiveLega) || selectedLeague

  const snapshot: SavedLeagueSnapshot = {
    savedAt: new Date().toISOString(),
    league: saveLeagueKey,
    raceNumber: currentRace,
    csv: finalCsv,
    rows,
    finalRows,
    unionMeta,
    penalties,
    lapOverrides,
    dnfOverrides,
    manualGaraOverride,
    manualLegaOverride,
    manualPilotOverrides,
    manualAutoOverrides,
    manualDistaccoOverrides,
    manualQualiOverrides,
    bestQuali,
    bestRaceLap,
    winner,
  }

  setChampionshipState((prev) => {
    const prevRace = prev.races[currentRace] || {}

    return {
      ...prev,
      races: {
        ...prev.races,
        [currentRace]: {
          ...prevRace,
          [saveLeagueKey]: snapshot,
        },
      },
    }
  })

  setLastSaveLeagueMode(pendingSaveLeagueMode)
  setLastSavedLeagueName(saveLeagueKey)
  setShowConfirmSaveLeagueModal(false)
  setShowSaveLeagueSuccessModal(true)
  // forza refresh visivo immediato (già ok ma più reattivo)
setManualPilotDraft({})
setManualAutoDraft({})
setManualDistaccoDraft({})
}

function reopenSavedLeague(league: ChampionshipLeagueKey) {
  const snapshot = currentRaceSnapshot[league]
  if (!snapshot) return

  clearCurrentWorkbench(false)
  setUnknownDriverSelections({})
  setDismissedUnknownDrivers({})

  setWorkbenchDriverLeagueMap((prev) => {
    const hasWorkbenchData = CHAMPIONSHIP_LEAGUES.some(
      (leagueKey) => (prev[leagueKey] || []).length > 0
    )

    return hasWorkbenchData
      ? prev
      : cloneDriverLeagueMap(driverLeagueMap)
  })

  setSelectedLeague(league)
  setManualLegaOverride(snapshot.manualLegaOverride || league)
  setManualGaraOverride(
    snapshot.manualGaraOverride || String(snapshot.raceNumber || currentRace)
  )

  setCsv(snapshot.csv || "")
  setRows(Array.isArray(snapshot.rows) ? snapshot.rows : [])
  setUnionMeta(
    snapshot.unionMeta && typeof snapshot.unionMeta === "object"
      ? {
          gara: snapshot.unionMeta.gara || "",
          lobby: snapshot.unionMeta.lobby || "",
          lega: snapshot.unionMeta.lega || "",
        }
      : { gara: "", lobby: "", lega: "" }
  )

  setPenalties(snapshot.penalties || {})
  setLapOverrides(snapshot.lapOverrides || {})
  setDnfOverrides(snapshot.dnfOverrides || {})

  setManualPilotOverrides(snapshot.manualPilotOverrides || {})
  setManualAutoOverrides(snapshot.manualAutoOverrides || {})
  setManualDistaccoOverrides(snapshot.manualDistaccoOverrides || {})
  setManualQualiOverrides(snapshot.manualQualiOverrides || {})

  setManualPilotDraft({})
  setManualAutoDraft({})
  setManualDistaccoDraft({})
  setManualQualiDraft({})

  setShowPilotModal(false)
  setShowAutoModal(false)
  setShowDistaccoModal(false)
  setShowQualiModal(false)
}

function resetCurrentLeagueInRace() {
  setChampionshipState((prev) => {
    const currentRaceData = prev.races[currentRace] || {}
    const nextRaceData = { ...currentRaceData }
    delete nextRaceData[selectedLeague]

    return {
      ...prev,
      races: {
        ...prev.races,
        [currentRace]: nextRaceData,
      },
    }
  })

  clearCurrentWorkbench(false)
  setManualLegaOverride(selectedLeague)
  setWorkbenchDriverLeagueMap(cloneDriverLeagueMap(driverLeagueMap))
}

function resetAllLeaguesInCurrentRace() {
  setChampionshipState((prev) => {
    const nextRaces = { ...prev.races }
    delete nextRaces[currentRace]

    const nextRoundMovements = { ...(prev.roundMovements || {}) }
    delete nextRoundMovements[currentRace]

    return {
      ...prev,
      races: nextRaces,
      roundMovements: nextRoundMovements,
    }
  })

  clearCurrentWorkbench(false)
  setManualLegaOverride(selectedLeague)
  setWorkbenchDriverLeagueMap(cloneDriverLeagueMap(driverLeagueMap))
}

  function addPenaltyEntry(sourcePosGara: number) {
    const key = getPrtRowStableKey(sourcePosGara)
    setPenalties((prev) => {
      const next = { ...prev }
      next[key] = [...(next[key] || []), createPenaltyEntry()]
      return next
    })
  }

  function updatePenaltyEntry(sourcePosGara: number, entryId: string, patch: Partial<PenaltyEntry>) {
    const key = getPrtRowStableKey(sourcePosGara)
    setPenalties((prev) => {
      const next = { ...prev }
      next[key] = (next[key] || []).map((entry) =>
        entry.id === entryId ? { ...entry, ...patch } : entry
      )
      return next
    })
  }

  function removePenaltyEntry(sourcePosGara: number, entryId: string) {
    const key = getPrtRowStableKey(sourcePosGara)
    setPenalties((prev) => {
      const next = { ...prev }
      const filtered = (next[key] || []).filter((entry) => entry.id !== entryId)
      if (filtered.length === 0) {
        delete next[key]
      } else {
        next[key] = filtered
      }
      return next
    })
  }

  function setLapOverrideValue(sourcePosGara: number, value: string) {
    const key = getPrtRowStableKey(sourcePosGara)
    setLapOverrides((prev) => {
      const next = { ...prev }
      const clean = value.trim()
      if (!clean) {
        delete next[key]
      } else {
        next[key] = value
      }
      return next
    })
  }

  function setDnfOverrideValue(sourcePosGara: number, value: string) {
  const key = getPrtRowStableKey(sourcePosGara)

  setDnfOverrides((prev) => {
    const next = { ...prev }

    if (value === "DNFV") {
      next[key] = "DNFV"
    } else if (value === "DNF-I") {
      next[key] = "DNF-I"
    } else {
      next[key] = "DNF"
    }

    return next
  })
}

  function openPilotCorrectionModal() {
    window.scrollTo({ top: 0, behavior: "smooth" })
  const nextDraft: Record<number, string> = {}
  for (const row of displayRows) {
    nextDraft[row.sourcePosGara] = String(row.pilota ?? "").trim()
  }
  setManualPilotDraft(nextDraft)
  setShowPilotModal(true)
}

function applyPilotCorrections() {
  const cleaned: Record<number, string> = {}

  for (const row of previewRows) {
    const draftValue = String(manualPilotDraft[row.sourcePosGara] ?? "").trim()
    const originalValue = String(row.pilota ?? "").trim()

    if (draftValue && draftValue !== originalValue) {
      cleaned[row.sourcePosGara] = draftValue
    }
  }

  const nextAutoOverrides: Record<number, string> = {}

  for (const baseRow of previewRows) {
    const finalPilotName = String(
      cleaned[baseRow.sourcePosGara] ?? baseRow.pilota ?? ""
    ).trim()

    const originalAuto = String(baseRow.auto ?? "").trim()

    if (!finalPilotName) continue

    const sourceRow = previewRows.find(
      (candidate) => normalizePilot(candidate.pilota) === normalizePilot(finalPilotName)
    )

    if (!sourceRow) continue

    const sourceAuto = String(sourceRow.auto ?? "").trim()

    if (sourceAuto !== originalAuto) {
      nextAutoOverrides[baseRow.sourcePosGara] = sourceAuto
    }
  }

  setManualPilotOverrides(cleaned)
  setManualAutoOverrides(nextAutoOverrides)
  setShowPilotModal(false)
}

function resetPilotCorrections() {
  setManualPilotOverrides({})
  setManualPilotDraft({})
  setManualAutoOverrides({})
  setManualAutoDraft({})
  setShowPilotModal(false)
}

function openAutoCorrectionModal() {
  const nextDraft: Record<number, string> = {}
  for (const row of displayRows) {
    nextDraft[row.sourcePosGara] = String(row.auto ?? "").trim()
  }
  setManualAutoDraft(nextDraft)
  setShowAutoModal(true)
}

function applyAutoCorrections() {
  const cleaned: Record<number, string> = {}

  for (const row of previewRows) {
    const draftValue = String(manualAutoDraft[row.sourcePosGara] ?? "").trim()
    const originalValue = String(row.auto ?? "").trim()

    if (draftValue && draftValue !== originalValue) {
      cleaned[row.sourcePosGara] = draftValue
    }
  }

  setManualAutoOverrides(cleaned)
  setShowAutoModal(false)
}

function openQualiCorrectionModal() {
  const nextDraft: Record<number, string> = {}
  for (const row of displayRows) {
    nextDraft[row.sourcePosGara] = String(row.tempoQualifica ?? "").trim()
  }
  setManualQualiDraft(nextDraft)
  setShowQualiModal(true)
}

function applyQualiCorrections() {
  const cleaned: Record<number, string> = {}

  for (const row of previewRows) {
    const draftValue = String(manualQualiDraft[row.sourcePosGara] ?? "").trim()
    const originalValue = String(row.tempoQualifica ?? "").trim()

    if (draftValue && draftValue !== originalValue) {
      cleaned[row.sourcePosGara] = draftValue
    }
  }

  setManualQualiOverrides(cleaned)
  setShowQualiModal(false)
}

function resetQualiCorrections() {
  setManualQualiOverrides({})
  setManualQualiDraft({})
  setShowQualiModal(false)
}

function resetAutoCorrections() {
  setManualAutoOverrides({})
  setManualAutoDraft({})
  setShowAutoModal(false)
}

function openDistaccoCorrectionModal() {
  const nextDraft: Record<number, string> = {}
  for (const row of displayRows) {
    nextDraft[row.sourcePosGara] = String(row.distaccoDalPrimo ?? "").trim()
  }
  setManualDistaccoDraft(nextDraft)
  setShowDistaccoModal(true)
}

function applyDistaccoCorrections() {
  const cleaned: Record<number, string> = {}

  for (const row of previewRows) {
    const draftValue = String(manualDistaccoDraft[row.sourcePosGara] ?? "").trim()
    const originalValue = String(row.distaccoDalPrimo ?? "").trim()

    if (draftValue && draftValue !== originalValue) {
      cleaned[row.sourcePosGara] = draftValue
    }
  }

  setManualDistaccoOverrides(cleaned)
  setShowDistaccoModal(false)
}

function resetDistaccoCorrections() {
  setManualDistaccoOverrides({})
  setManualDistaccoDraft({})
  setShowDistaccoModal(false)
}

function resetAllManualCorrections() {
  setManualPilotOverrides({})
  setManualPilotDraft({})
  setShowPilotModal(false)

  setManualAutoOverrides({})
  setManualAutoDraft({})
  setShowAutoModal(false)

  setManualDistaccoOverrides({})
  setManualDistaccoDraft({})
  setShowDistaccoModal(false)

  setManualQualiOverrides({})
setManualQualiDraft({})
setShowQualiModal(false)
}

  const showMeta = prtMode || unionMode
const showLobby = unionMode

const movementSummaryText = useMemo(() => {
  const allEntries = CHAMPIONSHIP_LEAGUES.flatMap((league) =>
    getRoundMovementsForLeague(league)
  )

  if (allEntries.length === 0) return ""

  const parts: string[] = []

  for (const entry of allEntries) {
    if (entry.drawerAction === "move") {
      parts.push(`Stiamo muovendo ${entry.driverName} in ${entry.toLeague}`)
    }

    if (entry.drawerAction === "swap") {
      parts.push(
        `Stiamo scambiando ${entry.driverName} con ${entry.targetDriverName}`
      )
    }

    if (entry.drawerAction === "replace_remove") {
      parts.push(
        `Stiamo sostituendo ${entry.targetDriverName} con ${entry.driverName} in ${entry.toLeague}`
      )
    }
  }

  return parts.map((p) => `• ${p}`).join("\n")
}, [CHAMPIONSHIP_LEAGUES, getRoundMovementsForLeague])

const lastCreatedMovementText = useMemo(() => {
  if (!lastCreatedMovement) return ""

  if (lastCreatedMovement.drawerAction === "move") {
    return `Stiamo muovendo ${lastCreatedMovement.driverName} in ${lastCreatedMovement.toLeague}.`
  }

  if (lastCreatedMovement.drawerAction === "swap") {
    return `Stiamo scambiando ${lastCreatedMovement.driverName} con ${lastCreatedMovement.targetDriverName}.`
  }

  if (lastCreatedMovement.drawerAction === "replace_remove") {
    return `Stiamo sostituendo ${lastCreatedMovement.targetDriverName} con ${lastCreatedMovement.driverName} in ${lastCreatedMovement.toLeague}.`
  }

  return ""
}, [lastCreatedMovement])
  

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 24,
        color: "white",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
        background:
          "radial-gradient(1200px 600px at 15% 10%, rgba(255,215,0,0.14), transparent 50%)," +
          "radial-gradient(900px 500px at 85% 20%, rgba(160,90,255,0.16), transparent 50%)," +
          "linear-gradient(180deg, #0b0d12 0%, #07080c 100%)",
      }}
    >
      <div style={{ maxWidth: 1600, margin: "0 auto" }}>
  <div ref={appHeaderExportRef}>
    <AppHeader />
  </div>

        <div
          style={{
            marginTop: 14,
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
            boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 18, borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 14,
      flexWrap: "wrap",
      alignItems: "center",
    }}
  >
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center" }}>
      <HeaderBadge label="WINNER" value={winner} variant="silver" />

      <Separator />

      <HeaderBadge label="POLE (QUALIFICA)" value={bestQuali} variant="gold" />

      <Separator />

      <HeaderBadge label="BEST LAP (GARA)" value={bestRaceLap} variant="violet" />

      {showMeta && (
        <>
          <Separator />
          <HeaderBadge label="LEGA" value={effectiveLega} variant="gold" />
        </>
      )}

      {showMeta && (
        <>
          <Separator />
          <HeaderBadge label="GARA" value={normalizedGaraForOutput} variant="violet" />
        </>
      )}

      {showLobby && (
        <>
          <Separator />
          <HeaderBadge label="LOBBY" value={unionMeta.lobby} variant="gold" />
        </>
      )}
    </div>

    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
  <select
    value={currentRace}
    onChange={(e) => setCurrentRace(Number(e.target.value))}
    style={{
  padding: "8px 10px",                 // ⬅️ leggermente più compatto
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.18)",
  color: "white",
  fontWeight: 900,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  cursor: "pointer",

  width: "auto",                       // 🔥 NON full width
  minWidth: 110,                       // 🔥 base compatta
  maxWidth: 150,                       // 🔥 blocca allungamento
  flexShrink: 0,                       // 🔥 IMPORTANTISSIMO
}}
  >
    {RACE_OPTIONS.map((race) => (
      <option
        key={race.value}
        value={race.value}
        style={{ background: "#11151d", color: "white" }}
      >
        {race.label}
      </option>
    ))}
  </select>
</div>
  </div>

  {showReq && (
    <div style={{ marginTop: 10, fontSize: 13, opacity: 0.82, lineHeight: 1.45 }}>
      <div>
        Minimo richiesto: <b>Qualifica 1–8</b> e <b>Gara 1–8</b>. Gli screen <b>9–N</b> sono opzionali.
      </div>
      <div style={{ marginTop: 8, opacity: 0.85 }}>
        <b>Nota CSV:</b> la tabella resta in formato visuale GT7, mentre il CSV scaricato è in formato compatibile con il tuo sheet.
      </div>
      <div style={{ marginTop: 8, opacity: 0.85 }}>
        <b>Penalità DG:</b> applicabili ai piloti con tempo gara numerico. Per i doppiati inserisci manualmente il gap finale dal leader.
      </div>
    </div>
  )}
</div>

          <div style={{ padding: 18, display: "grid", gap: 16 }}>
  <div
    style={{
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(0,0,0,0.18)",
      padding: 14,
      display: "grid",
      gap: 12,
      boxShadow: "0 10px 30px rgba(0,0,0,0.20)",
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
      <div style={{ fontWeight: 900, opacity: 0.95 }}>Caricamento immagini</div>

      <div
  style={{
    display: "grid",
    gap: 10,
    justifyItems: "end",
  }}
>
  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
  <label
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.12)",
      background: showTable ? "rgba(255,215,0,0.12)" : "rgba(255,255,255,0.06)",
      color: "white",
      cursor: "pointer",
      fontWeight: 800,
      letterSpacing: 0.3,
      fontSize: 12,
      userSelect: "none",
    }}
  >
    <input
      type="checkbox"
      checked={showTable}
      onChange={(e) => setShowTable(e.target.checked)}
      style={{ transform: "scale(1.1)" }}
    />
    Mostra anteprima a colonne
  </label>

  <label
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.12)",
      background: prtMode ? "rgba(160,90,255,0.16)" : "rgba(255,255,255,0.06)",
      color: "white",
      cursor: "pointer",
      fontWeight: 800,
      letterSpacing: 0.3,
      fontSize: 12,
      userSelect: "none",
    }}
  >
    <input
      type="checkbox"
      checked={prtMode}
      onChange={(e) => {
        const checked = e.target.checked
        setPrtMode(checked)
        if (checked) setUnionMode(false)
        if (!checked && !unionMode) setUnionMode(true)
      }}
      style={{ transform: "scale(1.1)" }}
    />
    Modalità PRT
  </label>
</div>
</div>
</div>

    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      multiple
      onChange={(e) => setFiles(Array.from(e.target.files || []))}
      style={{ display: "none" }}
    />

    <input
  ref={backupInputRef}
  type="file"
  accept=".json,application/json"
  onChange={(e) => {
    const file = e.target.files?.[0]
    if (!file) return
    importChampionshipBackup(file)
    e.currentTarget.value = ""
  }}
  style={{ display: "none" }}
/>

<input
  ref={htmlFilesInputRef}
  type="file"
  accept=".html,text/html"
  multiple
  onChange={async (e) => {
    const picked = e.target.files
    if (!picked || picked.length === 0) return
    await importLeagueHtmlFiles(picked)
    e.currentTarget.value = ""
  }}
  style={{ display: "none" }}
/>

    <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
  }}
>
  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
    <button
      onClick={() => fileInputRef.current?.click()}
      style={{
        padding: "12px 16px",
        borderRadius: 14,
        border: "1px solid rgba(255,215,0,0.35)",
        background: "linear-gradient(180deg, rgba(255,215,0,0.18), rgba(0,0,0,0.10))",
        color: "white",
        fontWeight: 900,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        cursor: "pointer",
        boxShadow: "0 0 24px rgba(255,215,0,0.12)",
        whiteSpace: "nowrap",
      }}
    >
      Sfoglia file
    </button>

    <div style={{ fontSize: 12, opacity: 0.8 }}>
      Carica 2–4 immagini (Qualifica + Gara). Ordine consigliato: Quali 1–8, Quali 9–N, Gara 1–8, Gara 9–N
      <span style={{ opacity: 0 }}>.</span>
    </div>
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(2, 240px)",
      gap: 10,
      justifyContent: "end",
    }}
  >
    <button
      onClick={exportChampionshipBackup}
      style={{
        width: "100%",
        height: 42,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 14,
        border: "1px solid rgba(96,165,250,0.30)",
        background: "rgba(96,165,250,0.16)",
        color: "white",
        cursor: "pointer",
        fontWeight: 800,
        letterSpacing: 0.3,
        fontSize: 12,
        textTransform: "uppercase",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
    >
      Esporta backup completo
    </button>

    <button
      onClick={() => backupInputRef.current?.click()}
      style={{
        width: "100%",
        height: 42,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 14,
        border: "1px solid rgba(168,85,247,0.30)",
        background: "rgba(168,85,247,0.16)",
        color: "white",
        cursor: "pointer",
        fontWeight: 800,
        letterSpacing: 0.3,
        fontSize: 12,
        textTransform: "uppercase",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
    >
      Importa backup completo
    </button>
  </div>
</div>

    {files.length > 0 && (
  <div
    style={{
      fontSize: 12,
      opacity: 0.88,
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.03)",
      padding: "10px 12px",
    }}
  >
    <b>{files.length}</b> file selezionati
    <div style={{ marginTop: 6, display: "grid", gap: 2 }}>
      {files.slice(0, 8).map((f) => (
        <div key={f.name} style={{ opacity: 0.86 }}>
          • {f.name}
        </div>
      ))}
      {files.length > 8 && <div style={{ opacity: 0.75 }}>• ... +{files.length - 8}</div>}
    </div>
  </div>
)}
</div>

<div
  style={{
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.18)",
    padding: 14,
    display: "grid",
    gap: 12,
    boxShadow: "0 10px 30px rgba(0,0,0,0.20)",
  }}
>
  <div style={{ fontWeight: 900, opacity: 0.95 }}>Genera Estrazione tabella</div>

  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
    <button
  onClick={handleGenerateExtractionClick}
      disabled={loading || !canRun}
      style={{
        padding: "12px 16px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.18)",
        background: loading
          ? "rgba(255,255,255,0.08)"
          : !canRun
            ? "rgba(255,255,255,0.04)"
            : "rgba(255,215,0,0.18)",
        opacity: loading || !canRun ? 0.6 : 1,
        color: "white",
        fontWeight: 900,
        letterSpacing: 0.6,
        cursor: loading || !canRun ? "not-allowed" : "pointer",
        boxShadow: loading || !canRun ? "none" : "0 0 22px rgba(255,215,0,0.12)",
        textTransform: "uppercase",
      }}
    >
      {loading ? "Elaborazione..." : "Genera Estrazione tabella"}
    </button>

    <button
      onClick={resetAll}
      style={{
        padding: "12px 14px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        color: "white",
        cursor: "pointer",
        opacity: 0.9,
        textTransform: "uppercase",
        fontWeight: 900,
        letterSpacing: 0.4,
        fontSize: 12,
      }}
    >
      Reset
    </button>

    {!canRun && (
  <div style={{ fontSize: 12, opacity: 0.75 }}>
    Seleziona almeno 2 immagini (Quali + Gara).
  </div>
)}
</div>

<div
  style={{
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    padding: "10px 12px",
    display: "grid",
    gap: 10,
  }}
>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 10,
      flexWrap: "wrap",
      alignItems: "center",
    }}
  >
    <div style={{ fontSize: 12, opacity: 0.82, fontWeight: 900, textTransform: "uppercase" }}>
      Lega selezionata • Gara {currentRace}
    </div>

    <div style={{ fontSize: 12, opacity: 0.72 }}>
      {isCurrentRaceComplete ? "Gara completa" : "Gara non completa"}
    </div>
  </div>

  <div style={{ display: "grid", gap: 14 }}>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
        gap: 12,
        marginTop: 2,
      }}
    >
      {CHAMPIONSHIP_LEAGUES.map((league) => {
  const isActive = selectedLeague === league
  const isSaved = savedLeagueStatus[league]

  return (
    <button
      key={league}
      onClick={() => handleSelectLeague(league)}
      style={{
        padding: "12px 10px",
        borderRadius: 12,
        border: isSaved
          ? isActive
            ? "1px solid rgba(255,215,0,0.45)"
            : "1px solid rgba(34,197,94,0.35)"
          : isActive
            ? "1px solid rgba(255,215,0,0.35)"
            : "1px solid rgba(255,255,255,0.08)",
        background: isSaved
          ? isActive
            ? "linear-gradient(180deg, rgba(255,215,0,0.16), rgba(34,197,94,0.10))"
            : "rgba(34,197,94,0.14)"
          : isActive
            ? "rgba(255,215,0,0.12)"
            : "rgba(255,255,255,0.03)",
        color: "white",
        cursor: "pointer",
        opacity: 1,
        fontWeight: 900,
        fontSize: 12,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        boxShadow: isActive
          ? "0 0 18px rgba(255,215,0,0.10)"
          : isSaved
            ? "0 0 18px rgba(34,197,94,0.10)"
            : "none",
      }}
      title={isSaved ? `Apri ${league}` : `${league} non ancora salvata`}
    >
      {league} {isSaved ? "✅" : isActive ? "•" : ""}
    </button>
  )
})}
    </div>

    <div
      style={{
        height: 1,
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
        margin: "6px 0 2px 0",
      }}
    />

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
        gap: 10,
        alignItems: "stretch",
      }}
    >
      <div />

      <button
        onClick={openConfirmSaveLeagueModal}
        disabled={finalRows.length === 0}
        style={{
          width: "100%",
          padding: "10px 10px",
          borderRadius: 12,
          border: "1px solid rgba(34,197,94,0.30)",
          background: finalRows.length === 0 ? "rgba(255,255,255,0.06)" : "rgba(34,197,94,0.16)",
          color: "white",
          cursor: finalRows.length === 0 ? "not-allowed" : "pointer",
          fontWeight: 900,
          letterSpacing: 0.35,
          textTransform: "uppercase",
          fontSize: 11,
          boxSizing: "border-box",
        }}
      >
        {savedLeagueInCurrentRace ? "Sovrascrivi lega" : "Salva lega"}
      </button>

      <button
        onClick={resetCurrentLeagueInRace}
        disabled={!savedLeagueInCurrentRace}
        style={{
          width: "100%",
          padding: "10px 10px",
          borderRadius: 12,
          border: "1px solid rgba(245,158,11,0.30)",
          background: !savedLeagueInCurrentRace ? "rgba(255,255,255,0.06)" : "rgba(245,158,11,0.16)",
          color: "white",
          cursor: !savedLeagueInCurrentRace ? "not-allowed" : "pointer",
          fontWeight: 900,
          letterSpacing: 0.35,
          textTransform: "uppercase",
          fontSize: 11,
          boxSizing: "border-box",
        }}
      >
        Reset lega
      </button>

      <button
        onClick={() => setShowConfirmResetRaceModal(true)}
        disabled={!isCurrentRaceComplete && !CHAMPIONSHIP_LEAGUES.some((league) => savedLeagueStatus[league])}
        style={{
          width: "100%",
          padding: "10px 10px",
          borderRadius: 12,
          border: "1px solid rgba(245,158,11,0.30)",
          background:
            !isCurrentRaceComplete && !CHAMPIONSHIP_LEAGUES.some((league) => savedLeagueStatus[league])
              ? "rgba(255,255,255,0.06)"
              : "rgba(245,158,11,0.16)",
          color: "white",
          cursor:
            !isCurrentRaceComplete && !CHAMPIONSHIP_LEAGUES.some((league) => savedLeagueStatus[league])
              ? "not-allowed"
              : "pointer",
          fontWeight: 900,
          letterSpacing: 0.35,
          textTransform: "uppercase",
          fontSize: 11,
          boxSizing: "border-box",
        }}
      >
        Reset gara
      </button>

      <div />
    </div>
  </div>
</div>

{finalRows.length > 0 && (
  <div style={{ display: "grid", gap: 12 }}>
    <div
      style={{
        borderRadius: 16,
        padding: 12,
        ...overallBoxStyle(matchSummary.overallStatus),
        boxShadow: "0 10px 30px rgba(0,0,0,0.22)",
        display: "grid",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 0.2 }}>
          {matchSummary.overallStatus === "ok"
            ? "✅ MATCH 100%"
            : matchSummary.overallStatus === "warn"
              ? "⚠️ DA CONTROLLARE"
              : "❌ ERRORE REALE"}
        </div>

        <div style={{ fontSize: 14, fontWeight: 900 }}>
          Match esatto al {matchSummary.percentage}%
        </div>
      </div>

      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: unionMode
            ? "repeat(9, minmax(0, 1fr))"
            : "repeat(8, minmax(0, 1fr))",
          gap: 8,
          padding: "8px 10px",
          overflow: "hidden",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.20)",
          boxShadow: "0 0 24px rgba(255,215,0,0.06)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 14,
            background:
              "linear-gradient(90deg, transparent, rgba(255,215,0,0.18), transparent)",
            opacity: 0.35,
            animation: "unionLoadShine 4s linear infinite",
            pointerEvents: "none",
          }}
        />

        {[
          ["#", matchSummary.fields.posizione],
          ["Pilota", matchSummary.fields.pilota],
          ["Auto", matchSummary.fields.auto],
          ["Distacchi", matchSummary.fields.distacchi],
          ["PP", matchSummary.fields.pp],
          ["GV", matchSummary.fields.gv],
          ["Gara", matchSummary.fields.gara],
          ["Lega", matchSummary.fields.lega],
          ...(unionMode
            ? ([["Lobby", matchSummary.fields.lobby]] as [string, MatchFieldStatus][])
            : []),
        ].map(([label, status]) => (
          <div
            key={label}
            style={{
              position: "relative",
              zIndex: 1,
              borderRadius: 10,
              padding: "8px 10px",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 0.3,
              whiteSpace: "nowrap",
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(6px)",
              ...matchCellStyle(status as MatchFieldStatus),
            }}
          >
            {label} {statusBadge(status as MatchFieldStatus)}
          </div>
        ))}
      </div>

        {matchSummary.notes.length > 0 && (
          <div
            style={{
              fontSize: 11,
              opacity: 0.9,
              lineHeight: 1.4,
            }}
          >
            <b>Note:</b>
            <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
              {matchSummary.notes.map((note, idx) => (
                <li key={`${note}-${idx}`}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={() => openExportModal("png")}
          disabled={exporting}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.16)",
            background: exporting ? "rgba(255,255,255,0.08)" : "rgba(160,90,255,0.18)",
            color: "white",
            fontWeight: 900,
            letterSpacing: 0.6,
            cursor: exporting ? "not-allowed" : "pointer",
            boxShadow: exporting ? "none" : "0 0 22px rgba(160,90,255,0.12)",
            textTransform: "uppercase",
          }}
        >
          {exporting ? "Esportazione PNG..." : "Esporta PNG tabella"}
        </button>

        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: 14,
            border: "1px solid rgba(255,215,0,0.22)",
            background: exportMetaInPng ? "rgba(255,215,0,0.14)" : "rgba(255,255,255,0.06)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            fontSize: 12,
            boxShadow: exportMetaInPng ? "0 0 18px rgba(255,215,0,0.10)" : "none",
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={exportMetaInPng}
            onChange={(e) => setExportMetaInPng(e.target.checked)}
            style={{ transform: "scale(1.1)" }}
          />
          Includi Lobby, Gara, Lega
        </label>

        {hasAnyPenalty && (
          <div style={{ fontSize: 12, opacity: 0.82 }}>
            PNG e CSV stanno usando la <b>classifica post-penalità</b>.
          </div>
        )}
      </div>
    </div>
  )}
</div>

{loading && (
  <div
    style={{
      width: "100%",
      marginTop: -6,
      paddingLeft: 6,
      display: "grid",
      gap: 10,
    }}
  >
    <div
      style={{
        position: "relative",
        height: 12,
        maxWidth: 420,
        borderRadius: 999,
        background: "rgba(255,255,255,0.06)",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "inset 0 0 14px rgba(0,0,0,0.25)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 999,
          background:
            "linear-gradient(90deg, rgba(255,215,0,0.08), rgba(220,220,220,0.06), rgba(160,90,255,0.08))",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: "-35%",
          width: "35%",
          borderRadius: 999,
          background:
            "linear-gradient(90deg, rgba(255,215,0,0.95), rgba(220,220,220,0.95), rgba(160,90,255,0.95))",
          boxShadow:
            "0 0 18px rgba(255,215,0,0.25), 0 0 22px rgba(160,90,255,0.18)",
          animation: "unionLoadSlide 2.8s ease-in-out infinite",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: "-20%",
          width: "20%",
          borderRadius: 999,
          background:
            "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.42), rgba(255,255,255,0))",
          filter: "blur(2px)",
          animation: "unionLoadShine 2.8s ease-in-out infinite",
        }}
      />
    </div>

    <div style={{ fontSize: 12, opacity: 0.75 }}>
      Elaborazione immagini e generazione CSV...
    </div>
  </div>
)}

{error && (
  <pre
    style={{
      whiteSpace: "pre-wrap",
      color: "#ff6b6b",
      background: "rgba(0,0,0,0.35)",
      border: "1px solid rgba(255,255,255,0.10)",
      padding: 12,
      borderRadius: 14,
      overflowX: "auto",
    }}
  >
    {error}
  </pre>
)}

{displayRows.length > 0 && (matchSummary.fields.gara === "warn" || matchSummary.fields.lega === "warn") && (
  <div
    style={{
      borderRadius: 14,
      border: "1px solid rgba(255,215,0,0.28)",
      background: "rgba(255,215,0,0.08)",
      padding: 12,
      display: "flex",
      gap: 12,
      flexWrap: "wrap",
      alignItems: "center",
    }}
  >
    {matchSummary.fields.gara === "warn" && (
      <>
        <div style={{ fontSize: 13, fontWeight: 800 }}>
          Numero gara mancante:
        </div>
        <input
          type="text"
          inputMode="numeric"
          value={manualGaraOverride}
          onChange={(e) => setManualGaraOverride(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="Es. 5"
          style={{
            width: 90,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(0,0,0,0.22)",
            color: "white",
            fontWeight: 800,
          }}
        />
      </>
    )}

    {matchSummary.fields.lega === "warn" && (
      <>
        <div style={{ fontSize: 13, fontWeight: 800 }}>
          Lega mancante:
        </div>
        <input
          type="text"
          value={manualLegaOverride}
          onChange={(e) => setManualLegaOverride(e.target.value.toUpperCase())}
          placeholder="Es. PRO"
          style={{
            width: 140,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(0,0,0,0.22)",
            color: "white",
            fontWeight: 800,
          }}
        />
      </>
    )}
  </div>
)}

{showTable && finalRows.length > 0 && (
  <ResultsTable
    previewRows={finalRowsWithDnp}
    bestRaceLap={bestRaceLap}
    unionMeta={{ ...unionMeta, gara: normalizedGaraForOutput, lega: effectiveLega }}
    prtMode={prtMode}
    unionMode={unionMode}
    penalties={penalties}
    raceNumber={currentRace}
    tableTitle="Classifica (output)"
  />
)}

{displayRows.length > 0 && (
  <div
    style={{
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(255,255,255,0.05)",
      padding: 12,
      display: "flex",
      gap: 12,
      flexWrap: "wrap",
      alignItems: "center",
    }}
  >
    <div style={{ fontSize: 13, fontWeight: 800 }}>
      Correzioni Manuali
    </div>

    <button
      onClick={openPilotCorrectionModal}
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.16)",
        background: "rgba(255,255,255,0.08)",
        color: "white",
        cursor: "pointer",
        fontWeight: 800,
        textTransform: "uppercase",
        fontSize: 12,
      }}
    >
      Modifica Pilota
    </button>

    <button
      onClick={openAutoCorrectionModal}
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.16)",
        background: "rgba(255,255,255,0.08)",
        color: "white",
        cursor: "pointer",
        fontWeight: 800,
        textTransform: "uppercase",
        fontSize: 12,
      }}
    >
      Modifica Auto
    </button>

    <button
  onClick={openQualiCorrectionModal}
  style={{
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
    textTransform: "uppercase",
    fontSize: 12,
  }}
>
  Modifica Qualifiche
</button>

    <button
      onClick={openDistaccoCorrectionModal}
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.16)",
        background: "rgba(255,255,255,0.08)",
        color: "white",
        cursor: "pointer",
        fontWeight: 800,
        textTransform: "uppercase",
        fontSize: 12,
      }}
    >
      Modifica Distacco
    </button>

    <button
      onClick={resetAllManualCorrections}
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid rgba(239,68,68,0.35)",
        background: "rgba(239,68,68,0.14)",
        color: "white",
        cursor: "pointer",
        fontWeight: 800,
        textTransform: "uppercase",
        fontSize: 12,
      }}
    >
      Rimuovi modifiche
    </button>
  </div>
)}

{displayRows.length > 0 && (
  <div
    style={{
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(0,0,0,0.18)",
      padding: 14,
      display: "grid",
      gap: 12,
      boxShadow: "0 10px 30px rgba(0,0,0,0.20)",
    }}
  >
    <div
  onClick={() => setDgOpen((prev) => !prev)}
  style={{
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
    cursor: "pointer",
  }}
>
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontWeight: 900, opacity: 0.96 }}>Direzione Gara</div>
        <div style={{ fontSize: 12, opacity: 0.72 }}>
          Gestione penalità, doppiati e stati finali senza modificare il motore OCR.
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
  <div
    style={{
      padding: "8px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(255,255,255,0.05)",
      fontSize: 12,
      opacity: 0.82,
      fontWeight: 800,
      letterSpacing: 0.3,
      textTransform: "uppercase",
    }}
  >
    Ordine DG: Pilota • Penalità • Gap doppiato • DNF/DNFV
  </div>

  <div
    style={{
      width: 36,
      height: 36,
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.06)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 14,
      fontWeight: 900,
      opacity: 0.9,
      flexShrink: 0,
    }}
  >
    {dgOpen ? "▲" : "▼"}
  </div>
</div>
    </div>

    <div
  style={{
    display: dgOpen ? "block" : "none",
    fontSize: 12,
    opacity: 0.82,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    lineHeight: 1.45,
  }}
>
  In esportazione PNG il dettaglio penalità nel formato <b>P05 Lap3 04:47</b> viene mostrato solo in <b>modalità PRT</b>. In <b>UNION</b> nel PNG resta visibile solo il totale penalità.
  <br />
  Le penalità possono essere inserite anche per i piloti <b>doppiati</b> senza gap finale manuale, ma <b>non influenzano la classifica</b> finché il gap non viene compilato.
</div>

<div
  style={{
    display: dgOpen ? "block" : "none",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    overflow: "hidden",
  }}
>
  <table
    style={{
      width: "100%",
      borderCollapse: "collapse",
      tableLayout: "fixed",
    }}
  >
        <thead
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            background: "rgba(10,12,18,0.95)",
            backdropFilter: "blur(10px)",
          }}
        >
          <tr>
            <th
              style={{
                padding: "10px 10px",
                textAlign: "left",
                fontSize: 11,
                opacity: 0.82,
                width: "18%",
              }}
            >
              Pilota
            </th>

            <th
              style={{
                padding: "10px 10px",
                textAlign: "center",
                fontSize: 11,
                opacity: 0.82,
                width: "50%",
              }}
            >
              Penalità
            </th>

            <th
              style={{
                padding: "10px 10px",
                textAlign: "center",
                fontSize: 11,
                opacity: 0.82,
                width: "17%",
              }}
            >
              Gap finale doppiato
            </th>

            <th
              style={{
                padding: "10px 10px",
                textAlign: "center",
                fontSize: 11,
                opacity: 0.82,
                width: "15%",
              }}
            >
              DNF-I / DNF-V
            </th>
          </tr>
        </thead>

        <tbody>
          {dgInfo.map(({ row, isDoppiato, isDnf, key, manualGap, manualGapValid }, idx) => {
            const dnfValue = dnfOverrides[key] || "DNF"
            const entries = penalties[key] || []
            const penaltyMain = getPenaltyMainDisplay(entries, currentRace)
            const penaltyDisabled = false

            return (
              <tr
                key={`dg-${row.sourcePosGara}-${row.pilota}-${idx}`}
                style={{
                  background: idx % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.10)",
                }}
              >
                <TableCell>{row.pilota}</TableCell>

                <TableCell align="center">
                  <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
                    <div style={{ display: "grid", gap: 6, width: "100%" }}>
                      {entries.map((entry) => (
                        <div
                          key={entry.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "95px 82px 66px 66px 32px",
                            gap: 8,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <select
                            disabled={penaltyDisabled}
                            value={entry.code}
                            onChange={(e) => updatePenaltyEntry(row.sourcePosGara, entry.id, { code: e.target.value })}
                            style={{
                              padding: "7px 8px",
                              borderRadius: 10,
                              border: "1px solid rgba(255,255,255,0.14)",
                              background: penaltyDisabled ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.26)",
                              color: "white",
                              opacity: penaltyDisabled ? 0.65 : 1,
                            }}
                          >
                            <option value="" style={{ background: "#11151d", color: "white" }}>
    Penalità
  </option>
                            {penaltyCodeOptions.map((opt) => (
                              <option key={opt.value} value={opt.value} style={{ background: "#11151d", color: "white" }}>
                                {opt.label}
                              </option>
                            ))}
                          </select>

                            <select
                              disabled={penaltyDisabled}
                              value={entry.lap}
                              onChange={(e) => updatePenaltyEntry(row.sourcePosGara, entry.id, { lap: e.target.value })}
                              style={{
                                padding: "7px 8px",
                                borderRadius: 10,
                                border: "1px solid rgba(255,255,255,0.14)",
                                background: penaltyDisabled ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.26)",
                                color: "white",
                                opacity: penaltyDisabled ? 0.65 : 1,
                              }}
                            >
                              {lapOptions.map((lap) => (
                                <option key={lap} value={lap} style={{ background: "#11151d", color: "white" }}>
                                  {lap}
                                </option>
                              ))}
                            </select>

                            <select
                              disabled={penaltyDisabled}
                              value={entry.minute}
                              onChange={(e) => updatePenaltyEntry(row.sourcePosGara, entry.id, { minute: e.target.value })}
                              style={{
                                padding: "7px 8px",
                                borderRadius: 10,
                                border: "1px solid rgba(255,255,255,0.14)",
                                background: penaltyDisabled ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.26)",
                                color: "white",
                                opacity: penaltyDisabled ? 0.65 : 1,
                                textAlign: "center",
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                              }}
                            >
                              {minuteOptions.map((m) => (
                                <option key={m} value={m} style={{ background: "#11151d", color: "white" }}>
                                  {m}
                                </option>
                              ))}
                            </select>

                            <select
                              disabled={penaltyDisabled}
                              value={entry.second}
                              onChange={(e) => updatePenaltyEntry(row.sourcePosGara, entry.id, { second: e.target.value })}
                              style={{
                                padding: "7px 8px",
                                borderRadius: 10,
                                border: "1px solid rgba(255,255,255,0.14)",
                                background: penaltyDisabled ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.26)",
                                color: "white",
                                opacity: penaltyDisabled ? 0.65 : 1,
                                textAlign: "center",
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                              }}
                            >
                              {secondOptions.map((s) => (
                                <option key={s} value={s} style={{ background: "#11151d", color: "white" }}>
                                  {s}
                                </option>
                              ))}
                            </select>

                            <button
                              disabled={penaltyDisabled}
                              onClick={() => removePenaltyEntry(row.sourcePosGara, entry.id)}
                              style={{
                                width: 36,
                                height: 32,
                                borderRadius: 10,
                                border: "1px solid rgba(255,255,255,0.14)",
                                background: "rgba(255,255,255,0.06)",
                                color: "white",
                                cursor: penaltyDisabled ? "not-allowed" : "pointer",
                                opacity: penaltyDisabled ? 0.65 : 1,
                              }}
                              title="Rimuovi penalità"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                        <button
                          disabled={penaltyDisabled}
                          onClick={() => addPenaltyEntry(row.sourcePosGara)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,0.14)",
                            background: penaltyDisabled ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.26)",
                            color: "white",
                            cursor: penaltyDisabled ? "not-allowed" : "pointer",
                            opacity: penaltyDisabled ? 0.65 : 1,
                            fontWeight: 900,
                            fontSize: 12,
                          }}
                        >
                          + Penalità
                        </button>

                        <div
                          style={{
                            fontSize: 12,
                            opacity: 0.88,
                            fontWeight: 900,
                            color:
                              penaltyMain.kind === "dsq"
                                ? "#ff7cff"
                                : penaltyMain.kind === "ammonition"
                                  ? "#f59e0b"
                                  : penaltyMain.kind === "time"
                                    ? "#ffb3b3"
                                    : "rgba(255,255,255,0.65)",
                          }}
                        >
                          Totale DG: {penaltyMain.text}
                        </div>
                      </div>

                      {entries.length > 0 && (
                        <div
                          style={{
                            fontSize: 12,
                            opacity: 0.85,
                            borderTop: "1px solid rgba(255,255,255,0.08)",
                            paddingTop: 8,
                            width: "100%",
                            textAlign: "center",
                            whiteSpace: "normal",
                            lineHeight: 1.35,
                          }}
                        >
                          {entries.map((entry) => formatPenaltyDetail(entry)).join(" • ")}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell align="center">
                    {isDoppiato ? (
                      <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
                        <input
                          value={manualGap}
                          onChange={(e) => setLapOverrideValue(row.sourcePosGara, e.target.value)}
                          placeholder="1:14.960"
                          style={{
                            width: 130,
                            padding: "8px 10px",
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,0.14)",
                            background: "rgba(0,0,0,0.26)",
                            color: "white",
                            textAlign: "center",
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                          }}
                        />
                        <div
                          style={{
                            fontSize: 11,
                            opacity: manualGapValid ? 0.65 : 1,
                            color: manualGapValid ? "rgba(255,255,255,0.65)" : "#ff8a8a",
                          }}
                        >
                          {manualGap.trim()
                            ? manualGapValid
                              ? "Gap finale valido"
                              : "Usa m:ss.mmm"
                            : "Inserisci il gap dal pilota che precede"}
                        </div>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>

                  <TableCell align="center">
                    {isDnf ? (
                      <select
  value={dnfValue}
  onChange={(e) => setDnfOverrideValue(row.sourcePosGara, e.target.value)}
  style={{
    minWidth: 120,
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.26)",
    color: "white",
  }}
>
  <option value="DNF" style={{ background: "#11151d", color: "white" }}>
  DNF
</option>
<option value="DNF-I" style={{ background: "#11151d", color: "white" }}>
  DNF-I
</option>
<option value="DNFV" style={{ background: "#11151d", color: "white" }}>
  DNFV
</option>
</select>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )}

<div
  style={{
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.18)",
    padding: 14,
    display: "grid",
    gap: 12,
    boxShadow: "0 10px 30px rgba(0,0,0,0.20)",
  }}
>
  <div
    onClick={() => setDrawerOpen((prev) => !prev)}
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      flexWrap: "wrap",
      alignItems: "center",
      cursor: "pointer",
    }}
  >
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ fontWeight: 900, opacity: 0.96 }}>
        Cassetto piloti per lega
      </div>

      <div style={{ fontSize: 12, opacity: 0.72, lineHeight: 1.45 }}>
  Fonte ufficiale dei piloti per ogni lega. I DNP automatici vengono generati confrontando i presenti nella gara con questo cassetto.
</div>
    </div>

    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <div
        style={{
          padding: "8px 12px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.05)",
          fontSize: 12,
          opacity: 0.82,
          fontWeight: 800,
          letterSpacing: 0.3,
          textTransform: "uppercase",
        }}
      >
        {CHAMPIONSHIP_LEAGUES.reduce(
  (total, league) => total + (workbenchDriverLeagueMap[league]?.length || 0),
  0
)} piloti totali
      </div>

      {driversToRemoveAfterDsq.length > 0 && (
  <button
    onClick={(e) => {
      e.stopPropagation()
      setShowRemoveDsqDriversModal(true)
    }}
    style={{
      padding: "8px 12px",
      borderRadius: 12,
      border: "1px solid rgba(239,68,68,0.35)",
      background: "rgba(239,68,68,0.16)",
      color: "white",
      cursor: "pointer",
      fontWeight: 900,
      fontSize: 12,
      textTransform: "uppercase",
    }}
  >
    Rimuovi DSQ dal cassetto
  </button>
)}

      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 900,
          opacity: 0.9,
          flexShrink: 0,
        }}
      >
        {drawerOpen ? "▲" : "▼"}
      </div>
    </div>
  </div>

  <div
    style={{
      display: drawerOpen ? "grid" : "none",
      gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
      gap: 10,
    }}
  >
    {CHAMPIONSHIP_LEAGUES.map((league) => (
      <div
        key={league}
        style={{
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.10)",
          background:
            selectedLeague === league
              ? "linear-gradient(180deg, rgba(255,215,0,0.10), rgba(255,255,255,0.03))"
              : "rgba(255,255,255,0.04)",
          padding: 10,
          display: "grid",
          gap: 8,
          minHeight: 140,
        }}
      >
        <div
          style={{
            fontWeight: 900,
            fontSize: 12,
            letterSpacing: 0.35,
            textTransform: "uppercase",
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span>{league}</span>
          <span style={{ opacity: 0.72 }}>
            {workbenchDriverLeagueMap[league]?.length || 0}
          </span>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
  <input
    value={drawerDrafts[league] || ""}
    onChange={(e) =>
      setDrawerDrafts((prev) => ({
        ...prev,
        [league]: e.target.value,
      }))
    }
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        addPilotToLeagueDrawer(league)
      }
    }}
    placeholder="Aggiungi pilota"
    style={{
      flex: 1,
      minWidth: 0,
      padding: "8px 10px",
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(0,0,0,0.24)",
      color: "white",
      fontSize: 12,
      boxSizing: "border-box",
    }}
  />

  <button
    onClick={() => addPilotToLeagueDrawer(league)}
    style={{
      padding: "8px 10px",
      borderRadius: 10,
      border: "1px solid rgba(34,197,94,0.30)",
      background: "rgba(34,197,94,0.16)",
      color: "white",
      cursor: "pointer",
      fontWeight: 900,
      fontSize: 12,
      flexShrink: 0,
    }}
  >
    +
  </button>
</div>

{/* 🔥 BULK LIST QUI */}
<div style={{ display: "grid", gap: 6 }}>
  <textarea
    value={drawerBulkDrafts[league] || ""}
    onChange={(e) =>
      setDrawerBulkDrafts((prev) => ({
        ...prev,
        [league]: e.target.value,
      }))
    }
    placeholder="Incolla elenco piloti, uno per riga"
    rows={5}
    style={{
      width: "100%",
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(0,0,0,0.24)",
      color: "white",
      fontSize: 12,
      lineHeight: 1.4,
      resize: "vertical",
      boxSizing: "border-box",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
    }}
  />

  <button
    onClick={() => applyBulkPilotsToLeagueDrawer(league)}
    style={{
      padding: "8px 10px",
      borderRadius: 10,
      border: "1px solid rgba(96,165,250,0.30)",
      background: "rgba(96,165,250,0.16)",
      color: "white",
      cursor: "pointer",
      fontWeight: 900,
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    }}
  >
    Carica lista
  </button>
</div>

        <div style={{ display: "grid", gap: 4 }}>
  {(workbenchDriverLeagueMap[league] || []).length === 0 ? (
    <div style={{ fontSize: 12, opacity: 0.45 }}>Nessun pilota</div>
  ) : (
    workbenchDriverLeagueMap[league].map((pilot) => (
  <div
    key={`${league}-${pilot}`}
    style={{
      display: "grid",
      gap: 4,
      padding: "6px 0",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <div
        style={{
          fontSize: 12,
          opacity: 0.88,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={pilot}
      >
        • {pilot}
      </div>

      <button
        onClick={() => removePilotFromLeagueDrawer(league, pilot)}
        style={{
          width: 24,
          height: 24,
          borderRadius: 8,
          border: "1px solid rgba(239,68,68,0.28)",
          background: "rgba(239,68,68,0.14)",
          color: "white",
          cursor: "pointer",
          fontWeight: 900,
          flexShrink: 0,
          lineHeight: 1,
        }}
        title={`Rimuovi ${pilot}`}
      >
        ×
      </button>
    </div>

    {/* 👇 QUI LO SCAMBIO */}
    <select
      defaultValue=""
      onChange={(e) => {
        const selected = e.target.value
        if (!selected) return

        const targetLeague = CHAMPIONSHIP_LEAGUES.find((l) =>
  workbenchDriverLeagueMap[l].includes(selected)
)

        if (!targetLeague) return

        swapPilotsBetweenLeagues(league, targetLeague, pilot, selected)

        e.currentTarget.value = ""
      }}
      style={{
        width: "100%",
        padding: "6px 8px",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.24)",
        color: "white",
        fontSize: 11,
      }}
    >
      <option value="">Scambia con...</option>

      {CHAMPIONSHIP_LEAGUES.flatMap((l) =>
        l === league
          ? []
          : (workbenchDriverLeagueMap[l] || []).map((p) => (
              <option key={`${league}-${p}`} value={p}>
                {p} ({l})
              </option>
            ))
      )}
    </select>
  </div>
))
          )}
        </div>
      </div>
    ))}
  </div>
</div>

{isMovementRound(currentRace) && (
  <div
    style={{
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(0,0,0,0.18)",
      padding: 14,
      display: "grid",
      gap: 12,
      boxShadow: "0 10px 30px rgba(0,0,0,0.20)",
    }}
  >
    <div
      onClick={() => setMovementPanelOpen((prev) => !prev)}
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        alignItems: "center",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontWeight: 900, opacity: 0.96 }}>
          Promo / Retro / Riempimento lobby
        </div>

        <div style={{ fontSize: 12, opacity: 0.72, lineHeight: 1.45 }}>
          Round di snodo attivo. Prima si gestiscono i riempimenti lobby, poi le
          promo/retro sportive.
          {currentRace === 3 ? " In Gara 3 il ricalcolo punti resterà manuale." : ""}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.10)",
            background: hasCurrentRoundMovements
              ? "rgba(34,197,94,0.14)"
              : "rgba(255,255,255,0.05)",
            fontSize: 12,
            opacity: 0.82,
            fontWeight: 800,
            letterSpacing: 0.3,
            textTransform: "uppercase",
          }}
        >
          {hasCurrentRoundMovements ? "Movimenti presenti" : "Nessun movimento"}
        </div>

        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 900,
            opacity: 0.9,
            flexShrink: 0,
          }}
        >
          {movementPanelOpen ? "▲" : "▼"}
        </div>
      </div>
    </div>

    <div
      style={{
        display: movementPanelOpen ? "grid" : "none",
        gap: 12,
      }}
    >
      <div
  style={{
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    padding: 12,
    display: "grid",
    gridTemplateColumns:
      movementDrawerAction !== "move"
        ? "repeat(6, minmax(0, 1fr))"
        : "repeat(5, minmax(0, 1fr))",
    gap: 10,
    alignItems: "start",
  }}
>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 11, opacity: 0.8, fontWeight: 900, textTransform: "uppercase" }}>
            Lega origine
          </label>
          <select
            value={movementDraftLeague}
            onChange={(e) => setMovementDraftLeague(e.target.value as ChampionshipLeagueKey)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.24)",
              color: "white",
            }}
          >
            {CHAMPIONSHIP_LEAGUES.map((league) => (
              <option key={league} value={league} style={{ background: "#11151d", color: "white" }}>
                {league}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
  <label style={{ fontSize: 11, opacity: 0.8, fontWeight: 900, textTransform: "uppercase" }}>
    Pilota
  </label>
  <select
    value={movementDraftDriverName}
    onChange={(e) => setMovementDraftDriverName(e.target.value)}
    style={{
      width: "100%",
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(0,0,0,0.24)",
      color: "white",
    }}
  >
    <option value="" style={{ background: "#11151d", color: "white" }}>
      Seleziona pilota...
    </option>

    {(workbenchDriverLeagueMap[movementDraftLeague] || []).map((pilot) => (
  <option
    key={`${movementDraftLeague}-${pilot}`}
    value={pilot}
    style={{ background: "#11151d", color: "white" }}
  >
    {pilot}
  </option>
))}
</select>
</div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 11, opacity: 0.8, fontWeight: 900, textTransform: "uppercase" }}>
            Tipo movimento
          </label>
          <select
  value={movementDraftType}
  onChange={(e) => setMovementDraftType(e.target.value as MovementType)}
  style={{
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.24)",
    color: "white",
  }}
>
  <option value="promote" style={{ color: "#22c55e" }}>
    Promozione
  </option>
  <option value="relegate" style={{ color: "#ef4444" }}>
    Retrocessione
  </option>
</select>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
  <label
    style={{
      fontSize: 11,
      opacity: 0.8,
      fontWeight: 900,
      textTransform: "uppercase",
    }}
  >
    Azione cassetto
  </label>

  <select
    value={movementDrawerAction}
    onChange={(e) =>
      setMovementDrawerAction(e.target.value as MovementDrawerAction)
    }
    style={{
      width: "100%",
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(0,0,0,0.24)",
      color: "white",
    }}
  >
    <option value="move">Move Pilota</option>
    <option value="swap">Swap Pilota</option>
    <option value="replace_remove">Replace Pilota</option>
  </select>
</div>

{movementDrawerAction !== "move" && (
  <div style={{ display: "grid", gap: 6 }}>
    <label
      style={{
        fontSize: 11,
        opacity: 0.8,
        fontWeight: 900,
        textTransform: "uppercase",
      }}
    >
      Pilota target
    </label>

    <select
      value={movementDraftTargetDriver || ""}
      onChange={(e) =>
        setMovementDraftTargetDriver(e.target.value)
      }
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(0,0,0,0.24)",
        color: "white",
      }}
    >
      <option value="">Seleziona pilota...</option>

      {(workbenchDriverLeagueMap[movementDraftTargetLeague] || []).map((pilot) => (
        <option key={pilot} value={pilot}>
          {pilot}
        </option>
      ))}
    </select>
  </div>
)}

        <div style={{ display: "grid", gap: 6 }}>
  <label style={{ fontSize: 11, opacity: 0.8, fontWeight: 900, textTransform: "uppercase" }}>
    Lega destinazione
  </label>
  <div
    style={{
      width: "100%",
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(0,0,0,0.24)",
      color: "white",
      minHeight: 42,
      display: "flex",
      alignItems: "center",
      fontWeight: 800,
      boxSizing: "border-box",
    }}
  >
    {movementDraftTargetLeague}
  </div>
</div>
      </div>
<div style={{ display: "grid" }}>
  <button
    onClick={submitMovementDraft}
    style={{
      width: "100%",
      padding: "12px 16px",
      borderRadius: 12,
      border: "1px solid rgba(34,197,94,0.30)",
      background: "rgba(34,197,94,0.16)",
      color: "white",
      cursor: "pointer",
      fontWeight: 900,
      textTransform: "uppercase",
      letterSpacing: 0.35,
      fontSize: 12,
      boxSizing: "border-box",
    }}
  >
    Aggiungi movimento
  </button>
</div>
      <div
        style={{
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}
        >
          <thead
            style={{
              background: "rgba(10,12,18,0.96)",
            }}
          >
            <tr>
  <th style={{ padding: "10px", textAlign: "left", fontSize: 11, opacity: 0.82 }}>Lega origine</th>
  <th style={{ padding: "10px", textAlign: "left", fontSize: 11, opacity: 0.82 }}>Pilota</th>
  <th style={{ padding: "10px", textAlign: "center", fontSize: 11, opacity: 0.82 }}>Tipo</th>
  <th style={{ padding: "10px", textAlign: "center", fontSize: 11, opacity: 0.82 }}>Azione cassetto</th>
  <th style={{ padding: "10px", textAlign: "left", fontSize: 11, opacity: 0.82 }}>Pilota target</th>
  <th style={{ padding: "10px", textAlign: "center", fontSize: 11, opacity: 0.82 }}>Destinazione</th>
  <th style={{ padding: "10px", textAlign: "center", fontSize: 11, opacity: 0.82, width: 90 }}>Azione</th>
</tr>
          </thead>

          <tbody>
            {CHAMPIONSHIP_LEAGUES.flatMap((league) =>
              (getRoundMovementsForLeague(league) || []).map((entry, index) => (
                <tr
                  key={`${league}-${entry.driverName}-${entry.type}-${index}`}
                  style={{
                    background:
                      index % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.10)",
                  }}
                >
                  <td style={{ padding: "10px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
  {entry.fromLeague}
</td>

<td style={{ padding: "10px", borderBottom: "1px solid rgba(255,255,255,0.08)", fontWeight: 700 }}>
  {entry.driverName}
</td>

<td
  style={{
    padding: "10px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    textAlign: "center",
    textTransform: "uppercase",
    fontWeight: 900,
  }}
>
  {entry.type}
</td>

<td
  style={{
    padding: "10px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    textAlign: "center",
    fontWeight: 800,
    textTransform: "uppercase",
  }}
>
  {entry.drawerAction === "move"
    ? "Move"
    : entry.drawerAction === "swap"
      ? "Swap"
      : "Replace"}
</td>

<td
  style={{
    padding: "10px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    fontWeight: 700,
    opacity: entry.targetDriverName ? 0.92 : 0.45,
  }}
>
  {entry.targetDriverName || "-"}
</td>

<td
  style={{
    padding: "10px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    textAlign: "center",
    fontWeight: 800,
  }}
>
  {entry.toLeague}
</td>

<td
  style={{
    padding: "10px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    textAlign: "center",
  }}
>
  <button
                      onClick={() => removeRoundMovementEntry(league, index)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid rgba(239,68,68,0.28)",
                        background: "rgba(239,68,68,0.14)",
                        color: "white",
                        cursor: "pointer",
                        fontWeight: 900,
                        fontSize: 11,
                      }}
                    >
                      X
                    </button>
                  </td>
                </tr>
              ))
            )}

            {!hasCurrentRoundMovements && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: "14px",
                    textAlign: "center",
                    opacity: 0.58,
                    fontSize: 12,
                  }}
                >
                  Storico promo/retro
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
</div>
    </div>
  </div>
)}

<ChampionshipTableBlock
  selectedLeague={selectedLeague}
  currentRace={currentRace}
  championshipRacesIncludedLabel={championshipRacesIncludedLabel}
  driverChampionshipByLeague={driverChampionshipByLeague}
  manualRace12Draft={manualRace12Draft}
  driverRatingMap={driverRatingMap}
  setDriverRatingMap={setDriverRatingMap}
  exporting={false}
  editingRaceCell={editingRaceCell}
  setEditingRaceCell={setEditingRaceCell}
  setManualRace12Draft={setManualRace12Draft}
/>

{driverChampionshipByLeague[selectedLeague]?.length > 0 && (
  <div
    style={{
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(255,255,255,0.05)",
      padding: 12,
      display: "flex",
      gap: 12,
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 12,
    }}
  >
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ fontSize: 13, fontWeight: 800 }}>
        Export Classifica Generale Piloti
      </div>
      <div style={{ fontSize: 12, opacity: 0.72 }}>
  Esporta l'HTML della lega selezionata e lo memorizza anche tra gli HTML pronti per il portale generale.
</div>
    </div>

    <div
  style={{
    display: "grid",
    gap: 12,
    width: "100%",
  }}
>
  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
    <button
      onClick={() => openExportModal("championship-html")}
      style={{
        padding: "12px 16px",
        borderRadius: 14,
        border: "1px solid rgba(96,165,250,0.30)",
        background: "rgba(96,165,250,0.16)",
        color: "white",
        cursor: "pointer",
        fontWeight: 900,
        letterSpacing: 0.5,
        textTransform: "uppercase",
        boxShadow: "0 0 18px rgba(96,165,250,0.10)",
      }}
    >
      Esporta HTML classifica
    </button>

    <button
  onClick={downloadChampionshipGeneralHtmlExport}
  disabled={!canExportGeneralHtml}
  style={{
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid rgba(168,85,247,0.30)",
    background: canExportGeneralHtml
      ? "rgba(168,85,247,0.16)"
      : "rgba(255,255,255,0.06)",
    color: "white",
    cursor: canExportGeneralHtml ? "pointer" : "not-allowed",
    fontWeight: 900,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    boxShadow: canExportGeneralHtml
      ? "0 0 18px rgba(168,85,247,0.10)"
      : "none",
    opacity: canExportGeneralHtml ? 1 : 0.6,
  }}
  title={
    canExportGeneralHtml
      ? "Esporta il portale HTML generale"
      : `Servono almeno 3 leghe HTML pronte (${readyLeagueHtmlCount}/3)`
  }
>
  Esporta HTML generale
</button>

    <button
      onClick={() => htmlFilesInputRef.current?.click()}
      style={{
        padding: "12px 16px",
        borderRadius: 14,
        border: "1px solid rgba(34,197,94,0.30)",
        background: "rgba(34,197,94,0.16)",
        color: "white",
        cursor: "pointer",
        fontWeight: 900,
        letterSpacing: 0.5,
        textTransform: "uppercase",
        boxShadow: "0 0 18px rgba(34,197,94,0.10)",
      }}
    >
      Carica HTML leghe
    </button>

    <button
      onClick={() => setUploadedLeagueHtmls({})}
      style={{
        padding: "12px 16px",
        borderRadius: 14,
        border: "1px solid rgba(239,68,68,0.30)",
        background: "rgba(239,68,68,0.16)",
        color: "white",
        cursor: "pointer",
        fontWeight: 900,
        letterSpacing: 0.5,
        textTransform: "uppercase",
        boxShadow: "0 0 18px rgba(239,68,68,0.10)",
      }}
    >
      Svuota HTML caricati
    </button>
  </div>

  <div
    style={{
      display: "grid",
      gap: 10,
      padding: "12px 14px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.03)",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 900,
          opacity: 0.86,
          textTransform: "uppercase",
          letterSpacing: 0.35,
        }}
      >
        Stato HTML leghe
      </div>

      <div style={{ fontSize: 12, opacity: 0.68 }}>
  Verde = HTML pronto • Oro = lega selezionata • Pronte: <b>{readyLeagueHtmlCount}/3</b>
</div>
    </div>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
        gap: 10,
      }}
    >
      {CHAMPIONSHIP_LEAGUES.map((league) => {
  const loaded = !!uploadedLeagueHtmls[league]
  const loading = !!loadingLeagueHtmls[league]
  const isSelected = selectedLeague === league

        return (
          <div
            key={league}
            style={{
              padding: "12px 10px",
              borderRadius: 12,
              border: loading
  ? "1px solid rgba(96,165,250,0.40)"
  : loaded
    ? isSelected
      ? "1px solid rgba(255,215,0,0.45)"
      : "1px solid rgba(34,197,94,0.35)"
    : isSelected
      ? "1px solid rgba(255,215,0,0.35)"
      : "1px solid rgba(255,255,255,0.08)",
              background: loading
  ? "rgba(96,165,250,0.16)"
  : loaded
    ? isSelected
      ? "linear-gradient(180deg, rgba(255,215,0,0.16), rgba(34,197,94,0.10))"
      : "rgba(34,197,94,0.14)"
    : isSelected
      ? "rgba(255,215,0,0.12)"
      : "rgba(255,255,255,0.03)",
              color: "white",
              fontWeight: 900,
              fontSize: 12,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              textAlign: "center",
              boxShadow: isSelected
                ? "0 0 18px rgba(255,215,0,0.10)"
                : loaded
                  ? "0 0 18px rgba(34,197,94,0.10)"
                  : "none",
            }}
            title={
              loaded
                ? `HTML ${league} pronto`
                : `HTML ${league} non ancora pronto`
            }
          >
            {league} {loading ? "⏳" : loaded ? "✅" : "—"}
          </div>
        )
      })}
    </div>
  </div>
</div>
  </div>
)}
<div
  style={{
    position: "fixed",
    left: "-24000px",
    top: 0,
    width: 1920,
    pointerEvents: "none",
    zIndex: -1,
    opacity: 1,
  }}
>
  <div ref={championshipExportTableRef}>
    <ChampionshipTableBlock
  selectedLeague={selectedLeague}
  currentRace={currentRace}
  championshipRacesIncludedLabel={championshipRacesIncludedLabel}
  driverChampionshipByLeague={driverChampionshipByLeague}
  manualRace12Draft={manualRace12Draft}
  driverRatingMap={driverRatingMap}
  setDriverRatingMap={setDriverRatingMap}
  exporting={true}
/>
  </div>
</div>

  {finalCsv && finalRows.length > 0 && (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.22)",
        padding: 14,
        display: "grid",
        gap: 12,
        boxShadow: "0 10px 30px rgba(0,0,0,0.20)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 900, opacity: 0.96 }}>
            CSV Extractor Output {hasAnyPenalty ? "(post-penalità)" : ""}
          </div>
          <div style={{ fontSize: 12, opacity: 0.72 }}>
            Output finale pronto per copia, controllo rapido o download.
          </div>
        </div>

        <a
          href={"data:text/csv;charset=utf-8," + encodeURIComponent(finalCsv)}
          download="albixximo_race_extractor.csv"
          style={{
            color: "white",
            textDecoration: "none",
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(160,90,255,0.18)",
            fontSize: 13,
            fontWeight: 900,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            boxShadow: "0 0 18px rgba(160,90,255,0.10)",
          }}
        >
          Scarica CSV
        </a>
      </div>

      <div
        style={{
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
          padding: 10,
        }}
      >
        <textarea
          value={finalCsv}
          readOnly
          rows={14}
          style={{
            width: "100%",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.35)",
            color: "white",
            padding: 12,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 12,
            lineHeight: 1.45,
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
      </div>
    </div>
  )}

    <div
    style={{
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(0,0,0,0.18)",
      padding: "10px 12px",
    }}
  >
    <LegendBare />
  </div>
</div>
</div>

      {showConfirmSaveLeagueModal && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.72)",
      backdropFilter: "blur(6px)",
      display: "grid",
      placeItems: "center",
      zIndex: 9999,
      padding: 20,
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: 560,
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "linear-gradient(180deg, rgba(18,22,31,0.98), rgba(8,10,15,0.98))",
        boxShadow: "0 20px 80px rgba(0,0,0,0.55)",
        padding: 20,
        display: "grid",
        gap: 16,
      }}
    >
      <div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>
          {pendingSaveLeagueMode === "overwrite" ? "Sovrascrivere lega salvata?" : "Salvare lega nella gara?"}
        </div>
        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.78, lineHeight: 1.45 }}>
          <b>Gara:</b> {currentRace}
          <br />
          <b>Lega:</b> {selectedLeague}
          <br />
          {pendingSaveLeagueMode === "overwrite"
            ? "Esiste già un salvataggio per questa lega nella gara corrente. Verrà sostituito."
            : "La classifica corrente verrà salvata dentro la gara selezionata."}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => setShowConfirmSaveLeagueModal(false)}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Annulla
        </button>

        <button
          onClick={confirmSaveCurrentLeague}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border:
              pendingSaveLeagueMode === "overwrite"
                ? "1px solid rgba(245,158,11,0.30)"
                : "1px solid rgba(34,197,94,0.30)",
            background:
              pendingSaveLeagueMode === "overwrite"
                ? "rgba(245,158,11,0.20)"
                : "rgba(34,197,94,0.20)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {pendingSaveLeagueMode === "overwrite" ? "Sovrascrivi" : "Salva"}
        </button>
      </div>
    </div>
  </div>
)}
      
      {showSaveLeagueSuccessModal && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.72)",
      backdropFilter: "blur(6px)",
      display: "grid",
      placeItems: "center",
      zIndex: 9999,
      padding: 20,
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: 560,
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "linear-gradient(180deg, rgba(18,22,31,0.98), rgba(8,10,15,0.98))",
        boxShadow: "0 20px 80px rgba(0,0,0,0.55)",
        padding: 20,
        display: "grid",
        gap: 16,
      }}
    >
      <div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>
          {lastSaveLeagueMode === "overwrite" ? "Lega sovrascritta con successo" : "Lega salvata con successo"}
        </div>

        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.78, lineHeight: 1.45 }}>
          <b>Gara:</b> {currentRace}
          <br />
          <b>Lega:</b> {lastSavedLeagueName || selectedLeague}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => setShowSaveLeagueSuccessModal(false)}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(34,197,94,0.30)",
            background: "rgba(34,197,94,0.20)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Ok
        </button>
      </div>
    </div>
  </div>
)}
      
      {showConfirmResetRaceModal && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.72)",
      backdropFilter: "blur(6px)",
      display: "grid",
      placeItems: "center",
      zIndex: 9999,
      padding: 20,
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: 560,
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "linear-gradient(180deg, rgba(18,22,31,0.98), rgba(8,10,15,0.98))",
        boxShadow: "0 20px 80px rgba(0,0,0,0.55)",
        padding: 20,
        display: "grid",
        gap: 16,
      }}
    >
      <div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>
          Resettare tutte le leghe della gara corrente?
        </div>
        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.78, lineHeight: 1.45 }}>
          <b>Gara:</b> {currentRace}
          <br />
          Verranno eliminati tutti i salvataggi delle leghe relativi a questa gara.
          <br />
          La schermata corrente tornerà pulita, come un reset locale.
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => setShowConfirmResetRaceModal(false)}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Annulla
        </button>

        <button
          onClick={() => {
            resetAllLeaguesInCurrentRace()
            setShowConfirmResetRaceModal(false)
          }}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(245,158,11,0.30)",
            background: "rgba(245,158,11,0.20)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Conferma reset
        </button>
      </div>
    </div>
  </div>
)}

      {showRemoveDsqDriversModal && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.72)",
      backdropFilter: "blur(6px)",
      display: "grid",
      placeItems: "center",
      zIndex: 9999,
      padding: 20,
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: 560,
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.12)",
        background:
          "linear-gradient(180deg, rgba(18,22,31,0.98), rgba(8,10,15,0.98))",
        boxShadow: "0 20px 80px rgba(0,0,0,0.55)",
        padding: 20,
        display: "grid",
        gap: 16,
      }}
    >
      <div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>
          Rimuovere piloti DSQ dal cassetto?
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            opacity: 0.78,
            lineHeight: 1.45,
          }}
        >
          Questi piloti hanno raggiunto il 4° DNP/DSQ in classifica generale e
          verranno rimossi dal cassetto piloti:
        </div>

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gap: 6,
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          {driversToRemoveAfterDsq.map((driver) => (
            <div key={driver.pilota}>
              • {driver.pilota} — {driver.league}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setShowRemoveDsqDriversModal(false)}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Annulla
        </button>

        <button
          onClick={() => {
            removeDsqDriversFromDrawer()
            setShowRemoveDsqDriversModal(false)
          }}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(239,68,68,0.35)",
            background: "rgba(239,68,68,0.20)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Conferma rimozione
        </button>
      </div>
    </div>
  </div>
)}
      
    {activeUnknownDriver && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.72)",
      backdropFilter: "blur(6px)",
      display: "grid",
      placeItems: "center",
      zIndex: 10000,
      padding: 20,
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: 760,
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "linear-gradient(180deg, rgba(18,22,31,0.98), rgba(8,10,15,0.98))",
        boxShadow: "0 20px 80px rgba(0,0,0,0.55)",
        padding: 20,
        display: "grid",
        gap: 16,
      }}
    >
      <div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>
          Nome non riconosciuto
        </div>

        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.82, lineHeight: 1.5 }}>
          Ho letto <b>{activeUnknownDriver.rawName}</b> nella lega <b>{activeUnknownDriver.league}</b>, ma
          non ho trovato un match sicuro nel cassetto piloti di quella lega.
        </div>

        {activeUnknownDriver.suggestedOfficialName ? (
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.72 }}>
            Suggerimento migliore: <b>{activeUnknownDriver.suggestedOfficialName}</b> • score{" "}
            <b>{activeUnknownDriver.suggestedScore.toFixed(2)}</b>
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <label
          style={{
            fontSize: 12,
            opacity: 0.82,
            textTransform: "uppercase",
            fontWeight: 900,
          }}
        >
          Pilota ufficiale della lega
        </label>

        <select
          value={
            unknownDriverSelections[activeUnknownDriver.id] ??
            activeUnknownDriver.suggestedOfficialName ??
            ""
          }
          onChange={(e) =>
            setUnknownDriverSelections((prev) => ({
              ...prev,
              [activeUnknownDriver.id]: e.target.value,
            }))
          }
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(0,0,0,0.26)",
            color: "white",
          }}
        >
          <option value="" style={{ background: "#11151d", color: "white" }}>
            Seleziona pilota...
          </option>

          {(workbenchDriverLeagueMap[activeUnknownDriver.league] || []).map((pilot) => (
            <option
              key={`${activeUnknownDriver.id}-${pilot}`}
              value={pilot}
              style={{ background: "#11151d", color: "white" }}
            >
              {pilot}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <button
  onClick={() => {
    const selectedOfficial =
      unknownDriverSelections[activeUnknownDriver.id] ||
      activeUnknownDriver.suggestedOfficialName

    if (!selectedOfficial) return

    saveDriverAliasForLeague(
      activeUnknownDriver.league,
      activeUnknownDriver.rawName,
      selectedOfficial
    )
    setRows((prev) => {
  const rawKey = normalizeDriverLookupName(activeUnknownDriver.rawName)

  const renamedRows = prev.map((row: ExtractRow) => {
    const rowKey = normalizeDriverLookupName(row.pilota)

    if (rowKey !== rawKey) return row

    return {
      ...row,
      pilota: selectedOfficial,
    }
  })

  return applyQualiRaceAliasToRows(
    renamedRows,
    qualiRows,
    activeUnknownDriver.rawName,
    selectedOfficial
  )
})

    setUnknownDriverSelections((prev) => {
      const next = { ...prev }
      delete next[activeUnknownDriver.id]
      return next
    })
  }}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(34,197,94,0.30)",
            background: "rgba(34,197,94,0.20)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Salva come alias
        </button>

        <button
  onClick={() => {
    const selectedOfficial =
      unknownDriverSelections[activeUnknownDriver.id] ||
      activeUnknownDriver.suggestedOfficialName

    if (!selectedOfficial) return

    renamePilotInsideLeagueDrawer(
      activeUnknownDriver.league,
      selectedOfficial,
      activeUnknownDriver.rawName
    )

    setUnknownDriverSelections((prev) => {
      const next = { ...prev }
      delete next[activeUnknownDriver.id]
      return next
    })
  }}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(245,158,11,0.30)",
            background: "rgba(245,158,11,0.20)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Rinomina nel cassetto
        </button>

        <button
  onClick={() => {
    addPilotToLeagueDrawerDirect(
      activeUnknownDriver.league,
      activeUnknownDriver.rawName
    )

    setUnknownDriverSelections((prev) => {
      const next = { ...prev }
      delete next[activeUnknownDriver.id]
      return next
    })
  }}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(96,165,250,0.30)",
            background: "rgba(96,165,250,0.20)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Aggiungi al cassetto
        </button>

        <button
          onClick={() =>
            dismissUnknownDriver(
              activeUnknownDriver.league,
              activeUnknownDriver.rawName
            )
          }
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Ignora per ora
        </button>
      </div>

      <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.45 }}>
        <b>Alias</b>: quando l’OCR legge questo nome, verrà ricondotto al pilota ufficiale scelto.
        <br />
        <b>Rinomina nel cassetto</b>: cambia proprio il nome ufficiale del pilota nella lega corrente.
      </div>
    </div>
  </div>
)}
      
      {showExportModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(6px)",
            display: "grid",
            placeItems: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 720,
              borderRadius: 22,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "linear-gradient(180deg, rgba(18,22,31,0.98), rgba(8,10,15,0.98))",
              boxShadow: "0 20px 80px rgba(0,0,0,0.55)",
              padding: 20,
              display: "grid",
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>
  {pendingHeaderExportType === "championship-html"
    ? "Personalizza intestazione HTML classifica"
    : "Personalizza intestazione PNG"}
</div>
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.76 }}>
  {pendingHeaderExportType === "championship-html"
    ? "Personalizzi l’intestazione della classifica generale esportata in HTML."
    : "Modifichi solo il contenuto dei testi. Font, dimensioni e stile restano invariati."}
</div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 12, opacity: 0.82, textTransform: "uppercase", fontWeight: 900 }}>
                  Titolo principale
                </label>
                <input
                  value={exportTextsDraft.mainTitle}
                  onChange={(e) => setExportTextsDraft((prev) => ({ ...prev, mainTitle: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.26)",
                    color: "white",
                  }}
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 12, opacity: 0.82, textTransform: "uppercase", fontWeight: 900 }}>
                  Testo accanto
                </label>
                <input
                  value={exportTextsDraft.sideLabel}
                  onChange={(e) => setExportTextsDraft((prev) => ({ ...prev, sideLabel: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.26)",
                    color: "white",
                  }}
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 12, opacity: 0.82, textTransform: "uppercase", fontWeight: 900 }}>
                  Testo piccolo sotto
                </label>
                <input
                  value={exportTextsDraft.subtitle}
                  onChange={(e) => setExportTextsDraft((prev) => ({ ...prev, subtitle: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.26)",
                    color: "white",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => setShowExportModal(false)}
                style={{
                  padding: "12px 16px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Annulla
              </button>

              <button
                onClick={confirmHeaderExport}
                style={{
                  padding: "12px 16px",
                  borderRadius: 14,
                  border: "1px solid rgba(160,90,255,0.30)",
                  background: "rgba(160,90,255,0.20)",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  boxShadow: "0 0 22px rgba(160,90,255,0.12)",
                }}
              >
                {pendingHeaderExportType === "championship-html"
  ? "Esporta HTML"
  : "Esporta PNG"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMovementCreatedModal && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.72)",
      backdropFilter: "blur(6px)",
      display: "grid",
      placeItems: "center",
      zIndex: 9999,
      padding: 20,
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: 520,
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.12)",
        background:
          "linear-gradient(180deg, rgba(18,22,31,0.98), rgba(8,10,15,0.98))",
        boxShadow: "0 20px 80px rgba(0,0,0,0.55)",
        padding: 20,
        display: "grid",
        gap: 16,
      }}
    >
      <div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>
          Movimento registrato
        </div>

        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.78, lineHeight: 1.45 }}>
  {lastCreatedMovementText || "È stata creata una nuova voce nella tabella dei movimenti del round."}
</div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <button
          onClick={() => setShowMovementCreatedModal(false)}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
          }}
        >
          Visualizza
        </button>

        <button
  onClick={() => {
  setShowMovementCreatedModal(false)
  setShowApplyLastMovementModal(true)
}}
  style={{
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(34,197,94,0.30)",
    background: "rgba(34,197,94,0.20)",
    color: "white",
    cursor: "pointer",
    fontWeight: 900,
    textTransform: "uppercase",
  }}
>
  Applica al cassetto
</button>
      </div>
    </div>
  </div>
)}
      {showMovementBaseModal && pendingMovementEntry ? (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      background: "rgba(0,0,0,0.72)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}
  >
    <div
      style={{
        width: "min(560px, 100%)",
        borderRadius: 24,
        border: "1px solid rgba(255,255,255,0.16)",
        background: "linear-gradient(180deg, rgba(18,18,24,0.98), rgba(5,5,8,0.98))",
        boxShadow: "0 24px 90px rgba(0,0,0,0.65)",
        padding: 22,
        color: "white",
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 14 }}>
        PROMOZIONE / RETROCESSIONE — Gara {currentRace}
      </div>

      <div style={{ lineHeight: 1.8, fontSize: 15 }}>
        <div><b>Pilota:</b> {pendingMovementEntry.driverName}</div>
        <div><b>Da:</b> {pendingMovementEntry.fromLeague}</div>
        <div><b>A:</b> {pendingMovementEntry.toLeague}</div>
      </div>

      <div style={{ marginTop: 18, fontSize: 15 }}>
        Totale consolidato dopo Gara {getPreviousMovementCheckpoint(currentRace)} rilevato:
      </div>

      <div
        style={{
          marginTop: 8,
          padding: "12px 14px",
          borderRadius: 14,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.14)",
          fontSize: 24,
          fontWeight: 900,
        }}
      >
        {detectedMovementBasePoints}
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
        <label>
          <input
            type="radio"
            checked={movementBaseMode === "detected"}
            onChange={() => setMovementBaseMode("detected")}
          />{" "}
          Sì, conferma
        </label>

        <label>
          <input
            type="radio"
            checked={movementBaseMode === "manual"}
            onChange={() => setMovementBaseMode("manual")}
          />{" "}
          No, inserisco manualmente
        </label>
      </div>

      {movementBaseMode === "manual" ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ marginBottom: 6, fontWeight: 800 }}>
            Inserisci punteggio consolidato:
          </div>
          <input
            value={movementManualBasePoints}
            onChange={(e) => setMovementManualBasePoints(e.target.value)}
            type="number"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.20)",
              background: "rgba(0,0,0,0.35)",
              color: "white",
              fontSize: 18,
              fontWeight: 800,
            }}
          />
        </div>
      ) : null}

      <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button
          type="button"
          onClick={() => {
            setPendingMovementEntry(null)
            setShowMovementBaseModal(false)
          }}
        >
          Annulla
        </button>

        <button
          type="button"
          onClick={confirmPendingMovementWithBase}
        >
          Conferma movimento
        </button>
      </div>
    </div>
  </div>
) : null} 
      {showApplyMovementsModal && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.72)",
      backdropFilter: "blur(6px)",
      display: "grid",
      placeItems: "center",
      zIndex: 9999,
      padding: 20,
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: 520,
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.12)",
        background:
          "linear-gradient(180deg, rgba(18,22,31,0.98), rgba(8,10,15,0.98))",
        boxShadow: "0 20px 80px rgba(0,0,0,0.55)",
        padding: 20,
        display: "grid",
        gap: 16,
      }}
    >
      <div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>
          Applicare movimenti al cassetto?
        </div>

        <div
  style={{
    marginTop: 8,
    fontSize: 13,
    opacity: 0.78,
    lineHeight: 1.45,
    whiteSpace: "pre-line",
  }}
>
  {movementSummaryText || "Stiamo applicando i movimenti selezionati."}
</div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <button
          onClick={() => setShowApplyMovementsModal(false)}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
          }}
        >
          Annulla
        </button>

        <button
          onClick={() => {
            applyCurrentRoundMovementsToDrawer()
            setShowApplyMovementsModal(false)
          }}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(34,197,94,0.30)",
            background: "rgba(34,197,94,0.20)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
          }}
        >
          Conferma
        </button>
      </div>
    </div>
  </div>
)}

      {showApplyLastMovementModal && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.72)",
      backdropFilter: "blur(6px)",
      display: "grid",
      placeItems: "center",
      zIndex: 9999,
      padding: 20,
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: 520,
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.12)",
        background:
          "linear-gradient(180deg, rgba(18,22,31,0.98), rgba(8,10,15,0.98))",
        boxShadow: "0 20px 80px rgba(0,0,0,0.55)",
        padding: 20,
        display: "grid",
        gap: 16,
      }}
    >
      <div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>
          Applicare questo movimento al cassetto?
        </div>

        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.78, lineHeight: 1.45 }}>
          {lastCreatedMovementText || "Stiamo applicando il movimento appena creato."}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <button
          onClick={() => setShowApplyLastMovementModal(false)}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
          }}
        >
          Annulla
        </button>

        <button
          onClick={() => {
  if (lastCreatedMovement) {
    applySingleMovementToDrawer(lastCreatedMovement)
  }

  setLastCreatedMovement(null)
  setShowApplyLastMovementModal(false)
}}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(34,197,94,0.30)",
            background: "rgba(34,197,94,0.20)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
          }}
        >
          Conferma
        </button>
      </div>
    </div>
  </div>
)}

      {showPilotModal && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.72)",
      backdropFilter: "blur(6px)",
      display: "grid",
      placeItems: "center",
      zIndex: 9999,
      padding: 20,
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: 1100,
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "linear-gradient(180deg, rgba(18,22,31,0.98), rgba(8,10,15,0.98))",
        boxShadow: "0 20px 80px rgba(0,0,0,0.55)",
        padding: 20,
        display: "grid",
        gap: 16,
      }}
    >
      <div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Correzione Pilota Manuale</div>
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.76 }}>
          Modifica manualmente il nome pilota. Le correzioni verranno applicate a tabella, DG, CSV e PNG.
        </div>
      </div>

      <div
        style={{
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.22)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            maxHeight: "60vh",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              tableLayout: "fixed",
            }}
          >
            <thead
              style={{
                position: "sticky",
                top: 0,
                zIndex: 2,
                background: "rgba(10,12,18,0.96)",
                backdropFilter: "blur(10px)",
              }}
            >
              <tr>
                <th style={{ padding: "12px", textAlign: "left", fontSize: 12, opacity: 0.8, width: 100 }}>
                  Pos
                </th>
                <th style={{ padding: "12px", textAlign: "left", fontSize: 12, opacity: 0.8, width: 320 }}>
                  Pilota OCR
                </th>
                <th style={{ padding: "12px", textAlign: "left", fontSize: 12, opacity: 0.8 }}>
                  Pilota corretto
                </th>
              </tr>
            </thead>

            <tbody>
              {displayRows.map((row) => {
                const currentValue = String(manualPilotDraft[row.sourcePosGara] ?? "").trim()
                const originalValue = String(row.pilota ?? "").trim()
                const changed = currentValue !== originalValue

                return (
                  <tr
                    key={`manual-pilot-${row.sourcePosGara}`}
                    style={{
                      background: changed
                        ? "linear-gradient(90deg, rgba(160,90,255,0.10), rgba(255,255,255,0.02))"
                        : "transparent",
                    }}
                  >
                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <PosBadge pos={row.posGara} />
                    </td>

                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.86)",
                        fontWeight: 700,
                      }}
                    >
                      {row.pilota || "-"}
                    </td>

                    <td
  style={{
    padding: "12px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  }}
>
  <div style={{ display: "grid", gap: 8 }}>
    <input
      value={manualPilotDraft[row.sourcePosGara] ?? ""}
      onChange={(e) =>
        setManualPilotDraft((prev) => ({
          ...prev,
          [row.sourcePosGara]: e.target.value,
        }))
      }
      placeholder="Correggi nome pilota"
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 10,
        border: changed
          ? "1px solid rgba(160,90,255,0.30)"
          : "1px solid rgba(255,255,255,0.14)",
        background: "rgba(0,0,0,0.24)",
        color: "white",
        boxSizing: "border-box",
      }}
    />

    <select
      defaultValue=""
      onChange={(e) => {
        const selected = e.target.value
        if (!selected) return

        const currentKey = row.sourcePosGara

        const otherRow = displayRows.find(
          (candidate) =>
            candidate.sourcePosGara !== currentKey &&
            String(candidate.pilota ?? "").trim() === selected
        )

        if (!otherRow) {
          e.currentTarget.value = ""
          return
        }

        const otherKey = otherRow.sourcePosGara

        const nextDraft: Record<number, string> = {}

        for (const r of displayRows) {
          nextDraft[r.sourcePosGara] = String(r.pilota ?? "").trim()
        }

        const currentPilot = nextDraft[currentKey]
        const otherPilot = nextDraft[otherKey]

        nextDraft[currentKey] = otherPilot
        nextDraft[otherKey] = currentPilot

        const cleaned: Record<number, string> = {}

        for (const baseRow of previewRows) {
          const draftValue = String(nextDraft[baseRow.sourcePosGara] ?? "").trim()
          const originalValue = String(baseRow.pilota ?? "").trim()

          if (draftValue !== originalValue) {
            cleaned[baseRow.sourcePosGara] = draftValue
          }
        }

        const nextAutoOverrides: Record<number, string> = {}

        for (const baseRow of previewRows) {
          const finalPilotName = String(
            cleaned[baseRow.sourcePosGara] ?? baseRow.pilota ?? ""
          ).trim()

          const originalAuto = String(baseRow.auto ?? "").trim()

          if (!finalPilotName) continue

          const sourceRow = previewRows.find(
            (candidate) => normalizePilot(candidate.pilota) === normalizePilot(finalPilotName)
          )

          if (!sourceRow) continue

          const sourceAuto = String(sourceRow.auto ?? "").trim()

          if (sourceAuto !== originalAuto) {
            nextAutoOverrides[baseRow.sourcePosGara] = sourceAuto
          }
        }

        setManualPilotOverrides(cleaned)
        setManualAutoOverrides(nextAutoOverrides)
        setManualPilotDraft({})
        setShowPilotModal(false)

        e.currentTarget.value = ""
      }}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(0,0,0,0.24)",
        color: "white",
        boxSizing: "border-box",
      }}
    >
      <option value="" style={{ background: "#11151d", color: "white" }}>
        Scambia con...
      </option>

      {displayRows
        .filter((candidate) => candidate.sourcePosGara !== row.sourcePosGara)
        .map((candidate) => (
          <option
            key={`pilot-option-${row.sourcePosGara}-${candidate.sourcePosGara}`}
            value={candidate.pilota}
            style={{ background: "#11151d", color: "white" }}
          >
            {candidate.pilota}
          </option>
        ))}
    </select>
  </div>
</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => setShowPilotModal(false)}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Chiudi
        </button>

        <button
          onClick={resetPilotCorrections}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Reset
        </button>

        <button
          onClick={applyPilotCorrections}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(160,90,255,0.30)",
            background: "rgba(160,90,255,0.20)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            boxShadow: "0 0 22px rgba(160,90,255,0.12)",
          }}
        >
          Applica correzioni
        </button>
      </div>
    </div>
  </div>
)}

{showAutoModal && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.72)",
      backdropFilter: "blur(6px)",
      display: "grid",
      placeItems: "center",
      zIndex: 9999,
      padding: 20,
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: 1100,
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "linear-gradient(180deg, rgba(18,22,31,0.98), rgba(8,10,15,0.98))",
        boxShadow: "0 20px 80px rgba(0,0,0,0.55)",
        padding: 20,
        display: "grid",
        gap: 16,
      }}
    >
      <div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Correzione Auto Manuale</div>
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.76 }}>
          Modifica manualmente l’auto. Le correzioni verranno applicate a tabella, DG, CSV e PNG.
        </div>
      </div>

      <div
        style={{
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.22)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            maxHeight: "60vh",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              tableLayout: "fixed",
            }}
          >
            <thead
              style={{
                position: "sticky",
                top: 0,
                zIndex: 2,
                background: "rgba(10,12,18,0.96)",
                backdropFilter: "blur(10px)",
              }}
            >
              <tr>
                <th style={{ padding: "12px", textAlign: "left", fontSize: 12, opacity: 0.8, width: 100 }}>
                  Pos
                </th>
                <th style={{ padding: "12px", textAlign: "left", fontSize: 12, opacity: 0.8, width: 260 }}>
                  Pilota
                </th>
                <th style={{ padding: "12px", textAlign: "left", fontSize: 12, opacity: 0.8, width: 320 }}>
                  Auto OCR
                </th>
                <th style={{ padding: "12px", textAlign: "left", fontSize: 12, opacity: 0.8 }}>
                  Auto corretta
                </th>
              </tr>
            </thead>

            <tbody>
              {displayRows.map((row) => {
                const currentValue = String(manualAutoDraft[row.sourcePosGara] ?? "").trim()
                const originalValue = String(row.auto ?? "").trim()
                const changed = currentValue !== originalValue

                return (
                  <tr
                    key={`manual-auto-${row.sourcePosGara}`}
                    style={{
                      background: changed
                        ? "linear-gradient(90deg, rgba(160,90,255,0.10), rgba(255,255,255,0.02))"
                        : "transparent",
                    }}
                  >
                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <PosBadge pos={row.posGara} />
                    </td>

                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        fontWeight: 700,
                      }}
                    >
                      {row.pilota || "-"}
                    </td>

                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.86)",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                        fontSize: 13,
                      }}
                    >
                      {row.auto || "-"}
                    </td>

                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <input
                        value={manualAutoDraft[row.sourcePosGara] ?? ""}
                        onChange={(e) =>
                          setManualAutoDraft((prev) => ({
                            ...prev,
                            [row.sourcePosGara]: e.target.value,
                          }))
                        }
                        placeholder="Correggi auto"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: changed
                            ? "1px solid rgba(160,90,255,0.30)"
                            : "1px solid rgba(255,255,255,0.14)",
                          background: "rgba(0,0,0,0.24)",
                          color: "white",
                          boxSizing: "border-box",
                        }}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => setShowAutoModal(false)}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Chiudi
        </button>

        <button
          onClick={resetAutoCorrections}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Reset
        </button>

        <button
          onClick={applyAutoCorrections}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(160,90,255,0.30)",
            background: "rgba(160,90,255,0.20)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            boxShadow: "0 0 22px rgba(160,90,255,0.12)",
          }}
        >
          Applica correzioni
        </button>
      </div>
    </div>
  </div>
)}

{showQualiModal && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.72)",
      backdropFilter: "blur(6px)",
      display: "grid",
      placeItems: "center",
      zIndex: 9999,
      padding: 20,
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: 1100,
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "linear-gradient(180deg, rgba(18,22,31,0.98), rgba(8,10,15,0.98))",
        boxShadow: "0 20px 80px rgba(0,0,0,0.55)",
        padding: 20,
        display: "grid",
        gap: 16,
      }}
    >
      <div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Correzione Qualifiche Manuale</div>
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.76 }}>
          Inserisci o correggi manualmente il tempo qualifica. Le modifiche verranno applicate a tabella, PP, best quali, CSV e PNG.
        </div>
      </div>

      <div
        style={{
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.22)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            maxHeight: "60vh",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              tableLayout: "fixed",
            }}
          >
            <thead
              style={{
                position: "sticky",
                top: 0,
                zIndex: 2,
                background: "rgba(10,12,18,0.96)",
                backdropFilter: "blur(10px)",
              }}
            >
              <tr>
                <th style={{ padding: "12px", textAlign: "left", fontSize: 12, opacity: 0.8, width: 100 }}>
                  Pos
                </th>
                <th style={{ padding: "12px", textAlign: "left", fontSize: 12, opacity: 0.8, width: 260 }}>
                  Pilota
                </th>
                <th style={{ padding: "12px", textAlign: "left", fontSize: 12, opacity: 0.8, width: 220 }}>
                  Qualifica OCR
                </th>
                <th style={{ padding: "12px", textAlign: "left", fontSize: 12, opacity: 0.8 }}>
                  Qualifica corretta
                </th>
              </tr>
            </thead>

            <tbody>
              {displayRows.map((row) => {
                const previewRow = previewRows.find(
  (r) => r.sourcePosGara === row.sourcePosGara
)

const originalValue = String(previewRow?.tempoQualifica ?? "").trim()
const currentValue = String(
  manualQualiDraft[row.sourcePosGara] ??
    manualQualiOverrides[row.sourcePosGara] ??
    row.tempoQualifica ??
    ""
).trim()

const changed = currentValue !== originalValue

                return (
                  <tr
                    key={`manual-quali-${row.sourcePosGara}`}
                    style={{
                      background: changed
                        ? "linear-gradient(90deg, rgba(160,90,255,0.10), rgba(255,255,255,0.02))"
                        : "transparent",
                    }}
                  >
                    <td style={{ padding: "12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <PosBadge pos={row.posGara} />
                    </td>

                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.86)",
                        fontWeight: 700,
                      }}
                    >
                      {row.pilota || "-"}
                    </td>

                    <td
  style={{
    padding: "12px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.86)",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 13,
  }}
>
  {renderPrtQualifyingCell({
    row,
    exporting: false,
  })}
</td>

                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div style={{ display: "grid", gap: 6 }}>
  <input
    value={manualQualiDraft[row.sourcePosGara] ?? ""}
    onChange={(e) =>
      setManualQualiDraft((prev) => ({
        ...prev,
        [row.sourcePosGara]: e.target.value,
      }))
    }
    placeholder="Es. 1:47.532"
    style={{
      width: "100%",
      padding: "10px 12px",
      borderRadius: 10,
      border: changed
        ? "1px solid rgba(160,90,255,0.30)"
        : "1px solid rgba(255,255,255,0.14)",
      background: changed
        ? "linear-gradient(90deg, rgba(160,90,255,0.12), rgba(0,0,0,0.24))"
        : "rgba(0,0,0,0.24)",
      color: "white",
      boxSizing: "border-box",
    }}
  />

  {changed && (
    <div style={{ fontSize: 11, opacity: 0.7 }}>
      Modificato
    </div>
  )}
</div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => setShowQualiModal(false)}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Chiudi
        </button>

        <button
          onClick={resetQualiCorrections}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Reset
        </button>

        <button
          onClick={applyQualiCorrections}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(160,90,255,0.30)",
            background: "rgba(160,90,255,0.20)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            boxShadow: "0 0 22px rgba(160,90,255,0.12)",
          }}
        >
          Applica correzioni
        </button>
      </div>
    </div>
  </div>
)}

{showDistaccoModal && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.72)",
      backdropFilter: "blur(6px)",
      display: "grid",
      placeItems: "center",
      zIndex: 9999,
      padding: 20,
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: 1100,
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "linear-gradient(180deg, rgba(18,22,31,0.98), rgba(8,10,15,0.98))",
        boxShadow: "0 20px 80px rgba(0,0,0,0.55)",
        padding: 20,
        display: "grid",
        gap: 16,
      }}
    >
      <div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Correzione Distacco Manuale</div>
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.76 }}>
          Inserisci un distacco manuale oppure uno stato come DOPPIATO, DNF, DNFV, BOX o DSQ.
        </div>
      </div>

      <div
        style={{
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.22)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            maxHeight: "60vh",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              tableLayout: "fixed",
            }}
          >
            <thead
              style={{
                position: "sticky",
                top: 0,
                zIndex: 2,
                background: "rgba(10,12,18,0.96)",
                backdropFilter: "blur(10px)",
              }}
            >
              <tr>
                <th style={{ padding: "12px", textAlign: "left", fontSize: 12, opacity: 0.8, width: 100 }}>
                  Pos
                </th>
                <th style={{ padding: "12px", textAlign: "left", fontSize: 12, opacity: 0.8, width: 260 }}>
                  Pilota
                </th>
                <th style={{ padding: "12px", textAlign: "left", fontSize: 12, opacity: 0.8, width: 220 }}>
                  Distacco OCR
                </th>
                <th style={{ padding: "12px", textAlign: "left", fontSize: 12, opacity: 0.8 }}>
                  Distacco corretto
                </th>
              </tr>
            </thead>

            <tbody>
              {displayRows.map((row) => {
                const currentValue = String(manualDistaccoDraft[row.sourcePosGara] ?? "").trim()
                const originalValue = String(row.distaccoDalPrimo ?? "").trim()
                const changed = currentValue !== originalValue

                return (
                  <tr
                    key={`manual-distacco-${row.sourcePosGara}`}
                    style={{
                      background: changed
                        ? "linear-gradient(90deg, rgba(160,90,255,0.10), rgba(255,255,255,0.02))"
                        : "transparent",
                    }}
                  >
                    <td style={{ padding: "12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <PosBadge pos={row.posGara} />
                    </td>

                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.86)",
                        fontWeight: 700,
                      }}
                    >
                      {row.pilota || "-"}
                    </td>

                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.86)",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                        fontSize: 13,
                      }}
                    >
                      {row.distaccoDalPrimo || "-"}
                    </td>

                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <input
                        value={manualDistaccoDraft[row.sourcePosGara] ?? ""}
                        onChange={(e) =>
                          setManualDistaccoDraft((prev) => ({
                            ...prev,
                            [row.sourcePosGara]: e.target.value,
                          }))
                        }
                        placeholder="Es. +12.345 / +1:14.960 / DOPPIATO / DNF / DNFV / BOX / DSQ"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: changed
                            ? "1px solid rgba(160,90,255,0.30)"
                            : "1px solid rgba(255,255,255,0.14)",
                          background: "rgba(0,0,0,0.24)",
                          color: "white",
                          boxSizing: "border-box",
                        }}
                      />

                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {["DOPPIATO", "DNF", "DNFV", "BOX", "DSQ"].map((label) => (
                          <button
                            key={label}
                            onClick={() =>
                              setManualDistaccoDraft((prev) => ({
                                ...prev,
                                [row.sourcePosGara]: label,
                              }))
                            }
                            style={{
                              padding: "6px 10px",
                              borderRadius: 8,
                              border: "1px solid rgba(255,255,255,0.16)",
                              background: "rgba(255,255,255,0.08)",
                              color: "white",
                              cursor: "pointer",
                              fontSize: 11,
                              fontWeight: 800,
                              textTransform: "uppercase",
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => setShowDistaccoModal(false)}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Chiudi
        </button>

        <button
          onClick={resetDistaccoCorrections}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Reset
        </button>

        <button
          onClick={applyDistaccoCorrections}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(160,90,255,0.30)",
            background: "rgba(160,90,255,0.20)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            boxShadow: "0 0 22px rgba(160,90,255,0.12)",
          }}
        >
          Applica correzioni
        </button>
      </div>
    </div>
  </div>
)}

<div
  style={{
    position: "fixed",
    left: "-20000px",
    top: 0,
    width: 1920,
    height: 1080,
    pointerEvents: "none",
    zIndex: -1,
    opacity: 1,
  }}
>
  <div ref={exportRef}>
    {finalRows.length > 0 && (
      <div
        style={{
          width: 1920,
          height: 1080,
          boxSizing: "border-box",
          display: "grid",
          gap: 12,
          padding: "10px 18px 12px 18px",
          alignContent: "start",
          borderRadius: 22,
          background:
            "radial-gradient(1200px 600px at 15% 10%, rgba(255,215,0,0.14), transparent 50%)," +
            "radial-gradient(900px 500px at 85% 20%, rgba(160,90,255,0.16), transparent 50%)," +
            "linear-gradient(180deg, #0b0d12 0%, #07080c 100%)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 14px 60px rgba(0,0,0,0.45)",
          overflow: "hidden",
        }}
      >
        <AppHeader
          mainTitle={exportTexts.mainTitle}
          sideLabel={exportTexts.sideLabel}
          subtitle={exportTexts.subtitle}
        />

        <SummaryStrip
          winner={winner}
          bestQuali={bestQuali}
          bestRaceLap={bestRaceLap}
          unionMeta={{ ...unionMeta, gara: normalizedGaraForOutput, lega: effectiveLega }}
          showMeta={showMeta}
          showLobby={showLobby}
          exporting={true}
        />

        <ResultsTable
          previewRows={finalRowsWithDnp}
          bestRaceLap={bestRaceLap}
          unionMeta={{ ...unionMeta, gara: normalizedGaraForOutput, lega: effectiveLega }}
          prtMode={prtMode}
          unionMode={unionMode}
          exporting={true}
          penalties={penalties}
          raceNumber={currentRace}
          forceHideMeta={!exportMetaInPng}
          tableTitle="Classifica definitiva"
        />
      </div>
    )}
  </div>
</div>

<div
  style={{
    position: "fixed",
    left: "-24000px",
    top: 0,
    width: 1920,
    pointerEvents: "none",
    zIndex: -1,
    opacity: 1,
  }}
>
  <div ref={championshipHtmlExportRef}>
    <div
      className="championship-html-export-root"
      style={{
        width: "100%",
        maxWidth: 1600,
        margin: "0 auto",
        display: "grid",
        gap: 14,
        padding: 18,
        boxSizing: "border-box",
        borderRadius: 22,
        background:
          "radial-gradient(1200px 600px at 15% 10%, rgba(255,215,0,0.14), transparent 50%)," +
          "radial-gradient(900px 500px at 85% 20%, rgba(160,90,255,0.16), transparent 50%)," +
          "linear-gradient(180deg, #0b0d12 0%, #07080c 100%)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 14px 60px rgba(0,0,0,0.45)",
      }}
    >
      <AppHeader
  mainTitle={exportTexts.mainTitle}
  sideLabel={exportTexts.sideLabel}
  subtitle={exportTexts.subtitle}
/>

<div
  style={{
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background:
      "linear-gradient(180deg, rgba(18,22,31,0.95), rgba(8,10,15,0.95))",
    boxShadow: "0 10px 40px rgba(0,0,0,0.45)",
    padding: 14,
    display: "grid",
    gap: 10,
  }}
>
  <div
    style={{
      fontSize: 14,
      fontWeight: 900,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    <span>
      <span style={{ color: "#22c55e" }}>Promozioni</span>{" "}
      <span style={{ color: "#ef4444" }}>• Retrocessioni</span>
    </span>

    <span style={{ fontSize: 11, opacity: 0.6 }}>
      TAP / CLICK
    </span>
  </div>

  <ChampionshipHtmlMovements
    currentRace={currentRace}
    championshipState={championshipState}
    selectedLeague={selectedLeague}
  />
</div>

<ChampionshipTableBlock
  selectedLeague={selectedLeague}
  currentRace={currentRace}
  championshipRacesIncludedLabel={championshipRacesIncludedLabel}
  driverChampionshipByLeague={driverChampionshipByLeague}
  manualRace12Draft={manualRace12Draft}
  driverRatingMap={driverRatingMap}
  setDriverRatingMap={setDriverRatingMap}
  exporting={true}
/>

<ChampionshipHtmlLegend />
  </div>
</div>
</div>
    </div>
  </div>
  )
}