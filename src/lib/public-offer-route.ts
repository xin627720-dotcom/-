import { NextResponse } from "next/server";
import { priceDataCacheHeaders } from "./cache-headers";
import {
  parsePublicOfferPaginationParams,
  PublicOfferQueryError,
  PUBLIC_OFFER_MAX_LIMIT,
  PUBLIC_OFFER_MAX_OFFSET,
  type PublicOfferPaginationParams,
} from "./public-offer-query";

export function parsePublicOfferPaginationForRoute(
  params: URLSearchParams,
): PublicOfferPaginationParams | NextResponse {
  try {
    return parsePublicOfferPaginationParams(params);
  } catch (error) {
    if (error instanceof PublicOfferQueryError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          maxLimit: PUBLIC_OFFER_MAX_LIMIT,
          maxOffset: PUBLIC_OFFER_MAX_OFFSET,
        },
        {
          status: error.status,
          headers: priceDataCacheHeaders(),
        },
      );
    }

    throw error;
  }
}
