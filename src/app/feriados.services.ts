import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface Feriado {
  date: string;
  name: string;
  type: string;
}

@Injectable({
  providedIn: 'root',
})
export class FeriadosService {
  private apiUrl = 'https://brasilapi.com.br/api/feriados/v1';

  constructor(private http: HttpClient) {}

  getFeriados(year: number): Observable<Feriado[]> {
    return this.http.get<Feriado[]>(`${this.apiUrl}/${year}`);
  }
}
