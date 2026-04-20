import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DesignNavComponent } from '../design-nav/design-nav';

@Component({
  selector: 'app-design-4',
  imports: [DesignNavComponent],
  templateUrl: './design-4.html',
  styleUrl: './design-4.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Design4Component {}
