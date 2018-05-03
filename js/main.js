let restaurants,
  neighborhoods,
  cuisines
var map
var markers = []

/* With internet connection, when Google Maps loads, its init event triggers loading page content (since
 * the map requires some of the restaurant data).  However, without internet, no content would display since
 * Google Maps doesn't call its init function in that case.  The service worker is set up to detect that 
 * failed fetch event and then message the client.  But... sometimes the client's listener doesn't load 
 * fast enough to receive that message.  So this boolean is part of a backup plan to still display content
 * in that situation.
 */
let isContentLoaded = false;  //set true in updateRestaurants()
let isMapLoaded = false;  //used to determine if a map exists and thus should have markers placed on it

/**
 * Set up the service worker
 */
document.addEventListener('DOMContentLoaded', (event) => {
  if (!navigator.serviceWorker) return;

  navigator.serviceWorker.register('/sw.js').then(function(registration) {
    console.log('ServiceWorker registration successful with scope: ', registration.scope);
  }, function(err) {
    console.log('ServiceWorker registration failed: ', err);
  });

  //for receiving a message from the service worker that google maps didn't load (when offline):
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data.msg == 'Google Maps failed') {
      console.log('Received msg from serviceworker: ' + event.data.msg);
      updateRestaurants();
    }
  });

  fetchNeighborhoods();
  fetchCuisines();

  //sometimes the service worker posts its message before the client is ready to receive
  //in that case, include this as a failsafe so that the list of restaurants automatically appears when offline
  setTimeout(function() {
    if (isContentLoaded) return;

    console.log('backup timeout called to ensure data loaded');
    updateRestaurants();
  }, 1000);
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  isMapLoaded = true;
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  let mapElem = document.getElementById('map');
  self.map = new google.maps.Map(mapElem, {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  //give the div a height so that the map appears:
  mapElem.setAttribute("style","height:400px");
  updateRestaurants();
}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
      isContentLoaded = true;
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  if (isMapLoaded) {  //then a map actually exists, so add markers.
    addMarkersToMap();
  }
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  let strName = DBHelper.imageUrlForRestaurant(restaurant);
  strName = strName.replace('/img/', '').replace('.jpg', '');
  strName = '/img/' + strName + '-2x.jpg';
  image.src = strName;
  //image.srcset = strName + ' 2x';  //serviceworker renders this pointless
  li.append(image);

  const name = document.createElement('h1');
  name.innerHTML = restaurant.name;
  li.append(name);

  image.alt = restaurant.name;

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const div_container = document.createElement('div');
  li.append(div_container);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.setAttribute('aria-label', 'View details about ' + restaurant.name);
  div_container.append(more);

  return li;
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}
