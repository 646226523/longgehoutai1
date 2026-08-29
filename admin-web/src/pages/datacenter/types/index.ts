export interface LoftCity {
  name: string;
  value: [number, number, number];
}

export interface AuctionItem {
  id: number; name: string; currentPrice: number; bidCount: number; image: string;
  seller: string; startTime: string; endTime: string; deposit: number; startingBid: number;
  topBidder: string; status: 'bidding' | 'upcoming' | 'ended'; heat: number;
  remainingDays?: number; province?: string;
}

export interface RaceItem {
  id: number; name: string; progress: number; returnedCount: number; totalCount: number;
  status: string; location?: string; club?: string; pigeonCount?: number; provinces?: string[];
  distance?: number; startTime?: string; estimatedReturnTime?: string; organizer?: string;
  level?: string; points?: number; participants?: number; routeType?: string;
}

export interface FlightData {
  id: string; ringNumber: string; currentPosition: string; speed: number; altitude: number;
  status: 'flying' | 'returning' | 'returned'; etaMinutes?: number; isAnomaly?: boolean;
  breed?: string; age?: string; gender?: '雄' | '雌'; owner?: string; loft?: string;
  startTime?: string; distance?: number; coord?: [number, number]; photo?: string;
}

export interface CityDetail { name: string; lofts: number; online: number; pigeons: number; races: number; }

export interface ProvinceDetailData {
  name: string; lofts: number; online: number; pigeons: number; races: number; cities: CityDetail[];
}

export type MapMode = 'nodes' | 'trails';
