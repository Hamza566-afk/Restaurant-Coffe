import { TestBed } from '@angular/core/testing';

import { ClientMenu } from './client-menu';

describe('ClientMenu', () => {
  let service: ClientMenu;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ClientMenu);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
