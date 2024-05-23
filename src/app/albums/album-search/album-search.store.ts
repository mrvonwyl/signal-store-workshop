import { Album, searchAlbums, sortAlbums } from '@/albums/album.model';
import { AlbumsService } from '@/albums/albums.service';
import { SortOrder } from '@/shared/models/sort-order.model';
import { computed, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, tap, exhaustMap } from 'rxjs';

export type AlbumSearchState = {
  query: string;
  order: SortOrder;
  showProgress: boolean;
  albums: Album[];
};

export const albumSearchStore = signalStore(
  withState<AlbumSearchState>({
    query: '',
    order: 'asc',
    showProgress: false,
    albums: [],
  }),
  withComputed((state) => {
    const filteredAlbums = computed(() => {
      return sortAlbums(
        searchAlbums(state.albums(), state.query()),
        state.order(),
      );
    });

    const totalAlbums = computed(() => {
      return filteredAlbums().length;
    });

    const showSpinner = computed(() => {
      return state.showProgress() && state.albums().length === 0;
    });

    return {
      filteredAlbums,
      totalAlbums,
      showSpinner,
    };
  }),
  withMethods((store) => {
    const albumService = inject(AlbumsService);
    const snackbar = inject(MatSnackBar);

    return {
      updateQuery(query: string): void {
        patchState(store, { query });
      },
      updateOrder(order: SortOrder): void {
        patchState(store, { order });
      },
      loadAllAlbums: rxMethod<void>(
        pipe(
          tap(() => {
            patchState(store, { showProgress: true });
          }),
          exhaustMap(() => {
            return albumService.getAll().pipe(
              tapResponse({
                next: (albums) =>
                  patchState(store, { albums, showProgress: false }),
                error: (error: Error) =>
                  snackbar.open(error.message, 'close', { duration: 5_000 }),
              }),
            );
          }),
        ),
      ),
    };
  }),
  withHooks(({ loadAllAlbums }) => ({
    onInit() {
      loadAllAlbums();
    },
  })),
);
