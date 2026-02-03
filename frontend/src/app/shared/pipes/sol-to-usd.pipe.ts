import { Pipe, PipeTransform } from '@angular/core';
import { SolPriceService } from '../../core/services/sol-price.service';

/**
 * Convert SOL amount to USD
 * Usage: {{ 5 | solToUsd }} → "$750.00"
 * Usage: {{ 5 | solToUsd:true }} → "5.00 SOL ($750.00)"
 */
@Pipe({
  name: 'solToUsd',
  standalone: true,
  pure: false // Re-evaluate when SOL price changes
})
export class SolToUsdPipe implements PipeTransform {
  constructor(private solPriceService: SolPriceService) {}

  transform(solAmount: number, showSol: boolean = false, decimals: number = 2): string {
    if (solAmount === null || solAmount === undefined) {
      return showSol ? '0.00 SOL ($0.00)' : '$0.00';
    }

    const usd = this.solPriceService.solToUsd(solAmount);

    if (showSol) {
      return `${solAmount.toFixed(decimals)} SOL ($${usd.toFixed(2)})`;
    }

    return `$${usd.toFixed(2)}`;
  }
}
