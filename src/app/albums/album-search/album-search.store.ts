import { Album, searchAlbums, sortAlbums } from '@/albums/album.model';
import { AlbumsService } from '@/albums/albums.service';
import { SortOrder } from '@/shared/models/sort-order.model';
import {
  withRequestStatus,
  setPending,
  setFulfilled,
  setError,
} from '@/shared/state/route/request-status.feature';
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
import { pipe, tap, exhaustMap, filter } from 'rxjs';

export type AlbumSearchState = {
  query: string;
  order: SortOrder;
  albums: Album[];
};

export const albumSearchStore = signalStore(
  withState<AlbumSearchState>({
    query: '',
    order: 'asc',
    albums: [],
  }),
  withRequestStatus(),
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
      return state.isPending() && state.albums().length === 0;
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
            patchState(store, setPending());
          }),
          exhaustMap(() => {
            return albumService.getAll().pipe(
              tapResponse({
                next: (albums) => patchState(store, { albums }, setFulfilled()),
                error: (error: Error) => {
                  patchState(store, setError(error.message));
                },
              }),
            );
          }),
        ),
      ),
      notifyOnError: rxMethod<string | null>(
        pipe(
          filter(Boolean),
          tap((error) => {
            snackbar.open(error, 'close', { duration: 5_000 });
          }),
        ),
      ),
    };
  }),
  withHooks(({ loadAllAlbums, notifyOnError, error }) => ({
    onInit() {
      loadAllAlbums();
      notifyOnError(error);
    },
  })),
);
