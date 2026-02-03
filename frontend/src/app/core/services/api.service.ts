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
  image_url?: string;
  creator: string;
  creator_type: 'human' | 'clawdbot' | 'agent';
  bonding_curve: string;
  current_price: number;
  market_cap: number;
  total_supply: number;
  holder_count: number;
  volume_24h: number;
  graduated: boolean;
  graduated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: number;
  transaction_signature: string;
  token_address: string;
  trader: string;
  side: 'buy' | 'sell';
  amount_sol: number;
  amount_tokens: number;
  price: number;
  fee: number;
  timestamp: string;
}

export interface CreateTokenRequest {
  name: string;
  symbol: string;
  description?: string;
  image_url?: string;
  initial_buy_sol?: number;
}

export interface TradeRequest {
  token_address: string;
  amount: number;
  slippage?: number;
}

export interface QuoteResponse {
  price: number;
  amount_out: number;
  fee: number;
  slippage: number;
  price_impact: number;
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

  createToken(request: CreateTokenRequest): Observable<{ token_address: string; transaction_signature: string }> {
    return this.http.post<{ token_address: string; transaction_signature: string }>(
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

  buyToken(request: TradeRequest): Observable<{ transaction_signature: string }> {
    return this.http.post<{ transaction_signature: string }>(
      `${this.baseUrl}/trade/buy`,
      request
    ).pipe(catchError(this.handleError));
  }

  sellToken(request: TradeRequest): Observable<{ transaction_signature: string }> {
    return this.http.post<{ transaction_signature: string }>(
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

  private handleError(error: any) {
    console.error('API Error:', error);
    return throwError(() => new Error(error.message || 'Server error'));
  }
}
