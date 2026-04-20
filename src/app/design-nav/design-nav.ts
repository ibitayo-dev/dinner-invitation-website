import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-design-nav',
  imports: [RouterLink],
  templateUrl: './design-nav.html',
  styleUrl: './design-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignNavComponent {
  @Input() current = 1;
  readonly designs = [1, 2, 3, 4, 5, 6, 7, 8];
}
