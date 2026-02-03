import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Token {
  address: string;
  name: string;
  symbol: string;
  description?: string;
  imageUrl?: string;
  creator: string;
  creatorType: 'human' | 'clawdbot' | 'agent';
  bondingCurve: string;
  currentPrice: number;
  marketCap: number;
  totalSupply: string; // bigint from backend
  holderCount: number;
  volume24h: number;
  graduated: boolean;
  graduatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Trade {
  id: number;
  transactionSignature: string;
  tokenAddress: string;
  trader: string;
  side: 'buy' | 'sell';
  amountSol: number;
  amountTokens: number;
  price: number;
  fee: number;
  timestamp: string;
  signature?: string; // Alias for transactionSignature
}

export interface Holder {
  address: string;
  balance: number;
  percentage: number;
}

export interface CreateTokenRequest {
  name: string;
  symbol: string;
  description?: string;
  imageUrl?: string;
  creator: string;
  creatorType?: string;
  initialBuy?: number;
}

export interface BuyRequest {
  tokenAddress: string;
  amountSol: number;
  buyer: string;
  minTokensOut?: number;
}

export interface SellRequest {
  tokenAddress: string;
  amountTokens: number;
  seller: string;
  minSolOut?: number;
}

export interface QuoteResponse {
  price: number;
  amountOut: number;
  fee: number;
  slippage: number;
  priceImpact: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Token endpoints
  getTrendingTokens(limit: number = 20): Observable<Token[]> {
    return this.http.get<Token[]>(`${this.baseUrl}/tokens/trending`, {
      params: new HttpParams().set('limit', limit.toString())
    }).pipe(catchError(this.handleError));
  }

  getNewTokens(limit: number = 20): Observable<Token[]> {
    return this.http.get<Token[]>(`${this.baseUrl}/tokens/new`, {
      params: new HttpParams().set('limit', limit.toString())
    }).pipe(catchError(this.handleError));
  }

  getToken(address: string): Observable<Token> {
    return this.http.get<Token>(`${this.baseUrl}/tokens/${address}`)
      .pipe(catchError(this.handleError));
  }

  searchTokens(query: string): Observable<Token[]> {
    return this.http.get<Token[]>(`${this.baseUrl}/tokens/search`, {
      params: new HttpParams().set('q', query)
    }).pipe(catchError(this.handleError));
  }

  getGraduatedTokens(limit: number = 20): Observable<Token[]> {
    return this.http.get<Token[]>(`${this.baseUrl}/tokens/filter/graduated`, {
      params: new HttpParams().set('limit', limit.toString())
    }).pipe(catchError(this.handleError));
  }

  getTokensByCreator(creator: string, limit: number = 20): Observable<Token[]> {
    return this.http.get<Token[]>(`${this.baseUrl}/tokens/filter/creator/${creator}`, {
      params: new HttpParams().set('limit', limit.toString())
    }).pipe(catchError(this.handleError));
  }

  getBotCreatedTokens(limit: number = 50): Observable<Token[]> {
    return this.http.get<Token[]>(`${this.baseUrl}/tokens/bot-created`, {
      params: new HttpParams().set('limit', limit.toString())
    }).pipe(catchError(this.handleError));
  }

  createToken(request: CreateTokenRequest): Observable<{ transaction: string; poolAddress: string; tokenMint: string; message: string }> {
    return this.http.post<{ transaction: string; poolAddress: string; tokenMint: string; message: string }>(
      `${this.baseUrl}/tokens/create`,
      request
    ).pipe(catchError(this.handleError));
  }

  // Trading endpoints
  getBuyQuote(tokenAddress: string, amountSol: number): Observable<QuoteResponse> {
    return this.http.get<QuoteResponse>(`${this.baseUrl}/trade/quote/buy`, {
      params: new HttpParams()
        .set('token', tokenAddress)
        .set('amount', amountSol.toString())
    }).pipe(catchError(this.handleError));
  }

  getSellQuote(tokenAddress: string, amountTokens: number): Observable<QuoteResponse> {
    return this.http.get<QuoteResponse>(`${this.baseUrl}/trade/quote/sell`, {
      params: new HttpParams()
        .set('token', tokenAddress)
        .set('amount', amountTokens.toString())
    }).pipe(catchError(this.handleError));
  }

  buyToken(request: BuyRequest): Observable<{ success: boolean; signature: string; trade: Trade }> {
    return this.http.post<{ success: boolean; signature: string; trade: Trade }>(
      `${this.baseUrl}/trade/buy`,
      request
    ).pipe(catchError(this.handleError));
  }

  sellToken(request: SellRequest): Observable<{ success: boolean; signature: string; trade: Trade }> {
    return this.http.post<{ success: boolean; signature: string; trade: Trade }>(
      `${this.baseUrl}/trade/sell`,
      request
    ).pipe(catchError(this.handleError));
  }

  getTradeHistory(tokenAddress: string, limit: number = 50): Observable<Trade[]> {
    return this.http.get<Trade[]>(`${this.baseUrl}/trade/history/${tokenAddress}`, {
      params: new HttpParams().set('limit', limit.toString())
    }).pipe(catchError(this.handleError));
  }

  getRecentTrades(limit: number = 50): Observable<Trade[]> {
    return this.http.get<Trade[]>(`${this.baseUrl}/trade/recent`, {
      params: new HttpParams().set('limit', limit.toString())
    }).pipe(catchError(this.handleError));
  }

  // User endpoints
  getUserTrades(walletAddress: string, limit: number = 50): Observable<Trade[]> {
    return this.http.get<Trade[]>(`${this.baseUrl}/trade/user/${walletAddress}`, {
      params: new HttpParams().set('limit', limit.toString())
    }).pipe(catchError(this.handleError));
  }

  // Alias for getTradeHistory (used by trades-holders-tabs component)
  getTokenTrades(tokenAddress: string, limit: number = 500): Observable<Trade[]> {
    return this.getTradeHistory(tokenAddress, limit).pipe(
      map(trades => trades.map(trade => ({
        ...trade,
        signature: trade.transactionSignature // Add signature alias
      })))
    );
  }

  // Get token holders
  getTokenHolders(tokenAddress: string): Observable<Holder[]> {
    return this.http.get<Holder[]>(`${this.baseUrl}/tokens/${tokenAddress}/holders`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any) {
    console.error('API Error:', error);
    return throwError(() => new Error(error.message || 'Server error'));
  }
}
