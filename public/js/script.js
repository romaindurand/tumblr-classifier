'use strict';
var posts = [];
var tags = [];
var photos = [];
var currentPost;
var currentImage;
var currentPostIndex;
var currentImageIndex;
var laddaSubmitBlogName = Ladda.create(document.querySelector('#submitBlogName'));

$.fn.center = function() {
  this.css('position', 'absolute');
  this.css('top', ($(window).height() - this.height()) / 2 + $(window).scrollTop() + 'px');
  this.css('left', ($(window).width() - this.width()) / 2 + $(window).scrollLeft() + 'px');
  return this;
};

$('#modalBlogName').center();
$('#submitBlogName').click(function() {
  var blogName = $('#inputBlogName').val().trim();
  if (!blogName) {
    return;
  }

  laddaSubmitBlogName.start();
  $.getJSON('http://localhost:3000/getPostsOffset/' + blogName + '/0', function(data) {
    if (!data.total_posts) {
      gotallposts([]);
      return;
    }
    var pages = Math.floor(data.total_posts / 20) + 1; //jscs:ignore requireCamelCaseOrUpperCaseIdentifiers
    var done = _.after(pages - 1, gotallposts);
    var posts = [];
    posts = _.union(posts, data.posts);
    var loaded = 1;
    laddaSubmitBlogName.setProgress(loaded / pages);
    for (var i = 1; i < pages; i++) {
      $.getJSON('http://localhost:3000/getPostsOffset/' + blogName + '/' + i * 20).done(gotJSON);
    }

    function gotJSON(data) {
      loaded++;
      laddaSubmitBlogName.setProgress(loaded / pages);
      posts = _.union(posts, data.posts);
      data.posts.forEach(function(el) {
        el.tags.forEach(function(tag) {
          if (_.indexOf(tags, tag, true) === -1) {
            tags.push(tag);
            tags.sort();
          }
        });
      });
      done(posts);
    }
  });
});

function bindKeys() {
  $(document).keydown(function(event) {
    window.console.log(event.which);
    switch (event.which) {
      case 39:
        next();
        break;

      case 37:
        previous();
        break;
    }
  });
}

function next() {
  currentImageIndex++;

  if (!photos[currentImageIndex]) {
    currentPostIndex++;
    currentImageIndex = 0;
  }

  if (!posts[currentPostIndex]) {
    currentPostIndex = 0;
  }

  updateCurrentImage();
  displayCurrentImage();
}

function previous() {
  currentImageIndex--;
  if (!photos[currentImageIndex]) {
    currentPostIndex--;

    if (!posts[currentPostIndex]) {
      currentPostIndex = posts.length - 1;
    }

    currentImageIndex = posts[currentPostIndex].photos.length - 1;
  }

  updateCurrentImage();
  displayCurrentImage();
}

function updateCurrentImage() {
  currentPost = posts[currentPostIndex];
  photos = currentPost.photos;
  currentImage = photos[currentImageIndex];
}

function gotallposts(data) {
  laddaSubmitBlogName.stop();
  if (!data.length) {
    return;
  }

  $('#modalBlogName').fadeOut();
  posts = data;
  currentPostIndex = 0;
  currentImageIndex = 0;
  updateCurrentImage();
  displayCurrentImage();
  bindKeys();
}

function displayCurrentImage() {
  var url = currentImage.original_size.url; //jscs:ignore requireCamelCaseOrUpperCaseIdentifiers
  $('#slide').html('<img src=\'' + url + '\' />').ready(function() {
    keepAspectRatio();
  });
}

function keepAspectRatio() {
  var imageRatio = currentImage.original_size.height / currentImage.original_size.width; //jscs:ignore requireCamelCaseOrUpperCaseIdentifiers
  var windowRatio = $(window).innerHeight() / $(window).innerWidth();
  if (imageRatio < windowRatio) {
    $('#slide img').css('height', $(window).innerWidth() * imageRatio);
    $('#slide img').css('padding-top', ($(window).innerHeight() - $(window).innerWidth() * imageRatio) / 2 + 'px');
  } else {
    $('#slide img').css('height', $(window).innerHeight());
    $('#slide img').css('padding-top', '0px');
  }
}
