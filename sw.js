const CACHE_NAME = 'restaurant-reviews-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/restaurant.html',
  '/css/styles.css',
  '/js/allMain.js',
  '/js/idb.js',
  '/js/restaurant_info.js'
  /*'/data/restaurants.json'  now on the other server.  Should you delete this from this git repository, too? */
];
for (let i = 1; i <= 10; i++) {
  URLS_TO_CACHE.push('/img/' + i + '-2x.jpg');
}
/*Initially caching everything renders srcset pointless, so just download the largest file.*/

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', function(event) {
  //to stop a Dev Tools error message:
  //https://stackoverflow.com/questions/48463483/what-causes-a-failed-to-execute-fetch-on-serviceworkerglobalscope-only-if
  if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
    return;
  }

  //I think you need to check for origin here?:
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) {  //return cache match
        return response;
      }
      else {
        return fetch(event.request).then(function(response) {
          return response;  //fetch as normal
          //nothing to cache as all site files will have been previously cached at install
        }).catch(function(error) {
            console.log('failed fetch request');
          });
      }
    })
  );
});