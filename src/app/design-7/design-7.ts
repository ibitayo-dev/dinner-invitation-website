import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DesignNavComponent } from '../design-nav/design-nav';

@Component({
  selector: 'app-design-7',
  imports: [DesignNavComponent],
  templateUrl: './design-7.html',
  styleUrl: './design-7.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Design7Component {}
