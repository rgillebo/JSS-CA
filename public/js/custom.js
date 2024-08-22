document.addEventListener('DOMContentLoaded', async function () {

  // Function to add event listener to the table for details buttons
  (function addDetailsButtonListeners() {
    var memesTable = document.getElementById('memesTable');
    if (memesTable) {
      memesTable.addEventListener('click', function (event) {
        var targetButton = event.target.closest('.details-btn');
        if (targetButton) {
          var memeId = targetButton.getAttribute('data-meme-id');
          showMemeDetails(memeId);
        }
      });
    }
  })();

  // Function to show meme details
  async function showMemeDetails(memeId) {
    try {
      var response = await fetch('/memes/details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memeId: memeId }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      var data = await response.json();
      if (data.success) {
        handleSuccessfulMemeDetails(data);
      } else {
        console.error(data.error);
      }
    } catch (error) {
      console.error(error);
    }
  }

  // Function to handle successful meme details
  function handleSuccessfulMemeDetails(data) {
    // Update the class of the table row to mark it as viewed
    var viewedRow = document.getElementById(data.id);
    if (viewedRow) {
      viewedRow.classList.add('viewed-meme');

      // Store viewed meme IDs in local storage
      var viewedMemes = JSON.parse(localStorage.getItem('viewedMemes')) || [];
      if (!viewedMemes.includes(data.id)) {
        viewedMemes.push(data.id);
        localStorage.setItem('viewedMemes', JSON.stringify(viewedMemes));
      }
    }

    // Redirect to the Meme Details page
    window.location.href = `/memes/details/${data.id}`;
  }

  // Function to update the table with new data
  function updateTable(data, loggedIn) {
    var tableBody = document.querySelector('#memesTable tbody');
    tableBody.innerHTML = '';

    data.forEach(meme => {
      var row = document.createElement('tr');
      row.id = meme.id;
      row.className = meme.viewed ? 'viewed-meme' : '';

      var nameCell = document.createElement('td');
      nameCell.textContent = meme.name;

      var imageCell = document.createElement('td');
      var image = document.createElement('img');
      image.src = meme.url;
      image.alt = meme.name;
      image.style.width = '20%';
      imageCell.appendChild(image);

      var detailsCell = document.createElement('td');

      // Add the 'Details' button based on loggedIn status
      if (loggedIn) {
        var detailsButton = document.createElement('button');
        detailsButton.className = 'details-btn';
        detailsButton.setAttribute('data-meme-id', meme.id);
        detailsButton.textContent = 'Details';
        detailsCell.appendChild(detailsButton);
      } else {
        detailsCell.textContent = 'Login to view details';
      }

      row.appendChild(nameCell);
      row.appendChild(imageCell);
      row.appendChild(detailsCell);

      tableBody.appendChild(row);
    });
  }

  // Check and apply background color based on viewedMemes
  var viewedMemes = JSON.parse(localStorage.getItem('viewedMemes')) || [];
  viewedMemes.forEach(function (memeId) {
    var viewedRow = document.getElementById(memeId);
    if (viewedRow) {
      viewedRow.classList.add('viewed-meme');
    }
  });

  // Add event listener for the search button
  var searchButton = document.getElementById('search-button');
  if (searchButton) {
    searchButton.addEventListener('click', async function () {
      var searchInput = document.getElementById('search-input');
      var searchTerm = searchInput.value.trim().toLowerCase();

      try {
        // Make a request to the server for search results
        var response = await fetch(`/memes/search/${searchTerm}`);

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        var data = await response.json();
        var isLoggedIn = data.loggedIn;
        // Update the table with search results and pass the loggedIn status
        updateTable(data.searchResults, isLoggedIn);
      } catch (error) {
        console.error(error);
      }
    });
  }

  // Add event listener for clearing the search
  var clearSearchButton = document.getElementById('clear-search-button');
  if (clearSearchButton) {
    clearSearchButton.addEventListener('click', function () {
      // Clear the search input
      var searchInput = document.getElementById('search-input');
      searchInput.value = '';

      // Redirect to the Meme Overview page
      window.location.href = '/memes/overview';
    });
  }

  // Add event listener for logout button
  var logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', function () {
      // Redirect to the logout page
      window.location.href = '/logout';
    });
  }

  // Add event listener for login button (if not logged in)
  var loginButton = document.getElementById('login-button');
  if (loginButton) {
    loginButton.addEventListener('click', function () {
      // Redirect to the login page
      window.location.href = '/login';
    });
  }

  // Fetch the initial logged-in status and memes
  try {
    var memesResponse = await fetch('/memes/overview', {
      headers: {
        "accept": "application/json",
      }
    });
    var memesDataResponse = await memesResponse.json();
    
    // Update the table with the fetched data and the loggedIn status
    updateTable(memesDataResponse.memes, memesDataResponse.loggedIn);

  } catch (error) {
    console.error('Error fetching data:', error);
  }
  // Used as a work around for fixing the issue of raw JSON data being displayed on /memes/overview when navigated by back/forward buttons. 
  await fetch('/memes/overview') 
});
