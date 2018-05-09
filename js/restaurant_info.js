let restaurant;
var map;

/* With internet connection, when Google Maps loads, its init event triggers loading page content (since
 * the map requires some of the restaurant data).  However, without internet, no content would display since
 * Google Maps doesn't call its init function in that case.  The service worker is set up to detect that 
 * failed fetch event and then message the client.  But... sometimes the client's listener doesn't load 
 * fast enough to receive that message.  So this boolean is part of a backup plan to still display content
 * in that situation.
 */
let isContentLoaded = false;
function displayContent() {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) {
      console.error(error);
    } else {
      fillBreadcrumb();
    }
  });

  isContentLoaded = true;
}

document.addEventListener('DOMContentLoaded', (event) => {
  if (!navigator.serviceWorker) return;

  //for receiving a message from the service worker that google maps didn't load (when offline):
  //in this situation, make sure the page's content displays
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data.msg == 'Google Maps failed') {
      console.log('Received message from service worker: ' + event.data.msg);
      if (isContentLoaded) return;
      displayContent();
    }
  });

  //sometimes the service worker posts its message before the client is ready to receive
  //in that case, include this as a failsafe so that cached content appears when offline
  setTimeout(function() {
    if (isContentLoaded) return;

    console.log('Backup timeout called to ensure data loaded');
    displayContent();
  }, 1000);
});



/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  isContentLoaded = true;
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      let mapElem = document.getElementById('map');
      self.map = new google.maps.Map(mapElem, {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      //give the div a height so that the map appears:
      mapElem.setAttribute("style","height:400px");
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
};

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  let strName = DBHelper.imageUrlForRestaurant(restaurant);
  strName = strName.replace('/img/', '').replace('.jpg', '');
  strName = '/img/' + strName + '-2x.jpg';
  image.src = strName;
  //image.srcset = strName + ' 2x';  //serviceworker renders this pointless
  image.alt = restaurant.name;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    let strTime = operatingHours[key];
    strTime = strTime.replace(', ', '<br>');
    time.innerHTML = strTime;
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = review.date;
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.className = "rating-text";
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.className = 'review-text';
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/*
This DBHelper function would be for the controller of restaurant.html's restaurant_info.js:

/**this is for restaurant_info.js
  /**
   * Fetch a restaurant by its ID.
   */
   /*
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }
/*