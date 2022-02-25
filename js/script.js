import * as api from "./api.js";
import * as helpers from "./helpers.js";

/*
    TODO :
     - Separate script into multiple files (how ?)
     - BONUS : Animate incoming posts (printing animation / paper slowly coming out + printing head moving back and forth) + sound effect (would need mute button) ?
*/

// Getting DOM elements
const postContainer = document.querySelector(".posts-container");
const postTemplate = document.querySelector("#post-template").content;

const form = document.querySelector("form");
const formInputUsername = document.querySelector("#form-input-username");
const formInputMessage = document.querySelector("#form-input-message");
const formStatusText = document.querySelector(".form-status");

const trendsContainer = document.querySelector(".trends-container");
const trendTemplate = document.querySelector(".trend-template").content;

const loadingText = document.querySelector("#loadingTextPosts");
const loadingTextTrends = document.querySelector("#loadingTextTrends");

// Global variables
const getNewPostsInterval = 5000; // How long should we wait before looking for new posts
const refreshPostInterval = 10000; // How long should a post wait before refreshing itself

let mostRecentTimeStamp = 0; // Timestamp of the most recent loaded post. Set to 0 by default (since no posts are loaded yet)
let formStatusClearTimeout; // id of timer in charge of clearing the form's status text
let isRetrievalInProgress = false; // Used to check if we have an ongoing request (and avoid duplicates)
let autoRefreshingPosts = [[],[]]; // List of posts currently set to auto-refresh (first array), and their associated interval ids (second array)

const viewportObserverOptions = {
    root: null, // null = we're observing the viewport
    rootMargin: '0px', // Extra margin to observe
    threshold: 0 // % of element that needs to be visible to trigger event
}
const viewportObserver = new IntersectionObserver(onPostEnteredViewport, viewportObserverOptions);

// Start doing things
api.url();

form.addEventListener("submit", onFormSubmit);
loadTrends(); // Load most used words
loadPosts(false); // Retrieve all posts on page load
setInterval(loadPosts, getNewPostsInterval, true); // Retrieve new posts every 5 seconds

// Functions

/*
    Called when the user submits the form
    Gets form input, sends the post then retrieves the latest posts
 */
function onFormSubmit(evt)
{
    evt.preventDefault(); // Prevent default form behaviour : we are submitting manually

    const userName = formInputUsername.value;
    const userMessage = formInputMessage.value;
    
    // Check if inputs are not empty and are of correct length, then send post
    if (userName.trim() !== "" && userMessage.trim() !== ""
        && userName.length < 17 && userMessage.length < 257
        && userName.length > 3 && userMessage.length > 3)
    {
        api.sendPost(userName, userMessage, onPostSent, onPostSendError);
    }
    else 
    {
        setFormStatus("Saisie invalide !");
    }
    form.reset();
    loadPosts(true);
}

/*
    Sets the form status text (message below form), then clears it after a short delay
 */
function setFormStatus(message)
{
    formStatusText.textContent = message;
    // If we have a scheduled form status clear, cancel it
    if (formStatusClearTimeout)
    {
        clearTimeout(formStatusClearTimeout);
    }
    formStatusClearTimeout = setTimeout(() => {
        formStatusText.textContent = "";
    }, 4000);
}

/*
    ------------------------------ POSTS -------------------------------------------------------------------------------
 */
/*
    Retrieves posts then adds them to the DOM
    onlyRecent : If we should retrieve only the latest posts (otherwise retrieve all posts)
 */
function loadPosts(onlyRecent)
{
    if (isRetrievalInProgress)
    {
        console.warn("A request is currently in progress. Prevented duplicate request.");
    }
    else
    {
        isRetrievalInProgress = true;
        let requestTimestamp; // From when should posts be retrieved

        if(onlyRecent)
        {
            console.log("Looking for new posts... (last timestamp : " + mostRecentTimeStamp + ")");
            requestTimestamp = mostRecentTimeStamp;
        }
        else
        {
            console.log("Retrieving all posts...");
            requestTimestamp = 0;
        }

        api.getPosts(requestTimestamp, onPostsRetrieved, onPostsRetrieveError, onPostsRetrieveComplete, onPostsRetrieveProgress)
    }
}

/*
    Adds a post to the DOM
    postObj : An object representing a post
*/
function addPost(postObj)
{
    // Get data from post object
    const {id, name, message, ts, likes, comments_count, authentication} = postObj;

    // Clone template and update necessary fields
    const newPost = postTemplate.cloneNode(true);

    const newPostArticle = newPost.querySelector("article"); // Parent element
    newPostArticle.id = "post-" + id;

    newPost.querySelector(".post-author").textContent = name;
    newPost.querySelector(".post-content").textContent = message;
    newPost.querySelector(".post-date").textContent = helpers.formatDate(ts);
    newPost.querySelector(".post-date").setAttribute("datetime", postObj.ts);
    newPost.querySelector(".post-like-count").textContent = likes;
    newPost.querySelector(".post-comment-count").textContent = comments_count;
    newPost.querySelector(".post-button-like").id = "like-" + id;
    newPost.querySelector(".post-button-icon-like").src = isPostLiked(String(id)) ? "assets/img/heart-fill.svg" : "assets/img/heart.svg";


    newPost.querySelector(".post-button-comment").id = "comment-" + id;

    newPost.querySelector(".post-button-like").addEventListener("click", onLikeClick);

    postContainer.appendChild(newPost);;
    viewportObserver.observe(newPostArticle);
}

/*
    Send a request to get the latest info about a post
    Then updates said post in DOM
    id: id of post to refresh
 */
function refreshPost(id)
{
    api.getPost(id, e => onSinglePostRetrieved(e.currentTarget, id), onSinglePostRetrieveError);
    // console.log("Attempting to refresh post " + id);
}

/*
    Enable or disable auto-refresh on a post, and update its avatar image
    id : The id of the post to update
    visible : Whether the post is on-screen or not
 */
function dynamicPostUpdate(id, isVisible)
{
    if (isVisible)
    {
        // Updating avatar image
        const post = document.querySelector("#post-" + id);
        const avatar = post.querySelector("img");
        if (avatar.src.endsWith("icon-avatar.svg"))
        {
            const name = post.querySelector(".post-author").textContent;
            avatar.src = api.url() + "/avatar/get?username=" + name +"&size=64";
        }

        // Enabling auto-refresh (we first make sure it's not already in our list
        if (!autoRefreshingPosts[0].includes(id))
        {
            // Auto-refresh interval
            const newIntervalId = setInterval(refreshPost, refreshPostInterval, id);
            // Register post to our watch list
            autoRefreshingPosts[0].push(id);
            autoRefreshingPosts[1].push(newIntervalId);
        }
    }
    else if(autoRefreshingPosts[0].includes(id)) // Make sure it's registered in our list before attempting to remove it
    {
        const index = autoRefreshingPosts[0].indexOf(id); // Get the index of our post in the list
        const timeOutToRemove = autoRefreshingPosts[1][index]; // Get the id of our interval from our previously retrieved index
        clearTimeout(timeOutToRemove);

        // Update the list
        autoRefreshingPosts[0].splice(index, 1);
        autoRefreshingPosts[1].splice(index, 1);
    }
}

// Event callbacks

/*
    Called when posts were successfully retrieved from the API
    Adds retrieved posts to the DOM by passing them as objects to function addPost
    Updates mostRecentTimestamp
 */
function onPostsRetrieved()
{
    loadingText.remove(); // Remove "Loading..." text

    const postList = JSON.parse(this.responseText).messages;
    if (postList.length > 0)
    {
        console.log("Retrieved new posts");
        postList.sort((t1, t2) => {return t1.ts - t2.ts;})
            .forEach(post => {
                mostRecentTimeStamp =  post.ts; // Update most recent timestamp (date of most recent tweet)
                addPost(post);
            });
    }
}

/*
    Called when posts could not be retrieved
    Shows an error
 */
function onPostsRetrieveError()
{
    loadingText.textContent = this.responseText;
    console.warn(this.responseText);
}

/*
    Called when progress updates are received from posts retrieval XHR
    Shows progress percentage
 */
function onPostsRetrieveProgress(evt)
{
    const percent = Math.round(evt.loaded / evt.total * 100);
    loadingText.textContent = "Chargement : " + percent + "%";
}

/*
    Called when retrieval of posts is complete.
    Sets isRetrievalInProgress, allowing new retrieval requests to be sent.
 */
function onPostsRetrieveComplete()
{
    isRetrievalInProgress = false;
}

/*
    Called when a post was sent successfully
 */
function onPostSent()
{
    setFormStatus("Message envoyé !");
    const response = JSON.parse(this.responseText);
    console.log("Sending post " + response.id + " - Success : " + response.success);
}

/*
    Called when API returns an error after attempting to send a post
 */
function onPostSendError()
{
    setFormStatus("Erreur lors de l'envoi. Consulter la console.");
    const response = JSON.parse(this.responseText)
    console.warn(response);
}

/*
    Called when a specific post has been retrieved
    Updates said post in DOM
 */
function onSinglePostRetrieved(request, id)
{
    const response = JSON.parse(request.responseText);
    const postToUpdate = document.querySelector("#post-" + id);
    postToUpdate.querySelector(".post-like-count").textContent = response.data.likes;
    postToUpdate.querySelector(".post-comment-count").textContent = response.data.comments_count;

    postToUpdate.querySelector(".post-button-icon-like").src = isPostLiked(String(id)) ? "assets/img/heart-fill.svg" : "assets/img/heart.svg";

    console.log("Refreshed post " + id + " with " + response.data.likes + " likes and " + response.data.comments_count + " comments.");
}

/*
    Called when retrieval of a specific post has failed
 */
function onSinglePostRetrieveError()
{
    console.warn("Failed to update post.");
}

/*
    Called when a post enters or exits the screen
    entries : post(s) that changed state / that exited or entered the screen
 */
function onPostEnteredViewport(entries)
{
    entries.forEach(entry => {
        dynamicPostUpdate(entry.target.id.split("-")[1], entry.isIntersecting);
    });
}

/*
    ------------------------------ LIKES -------------------------------------------------------------------------------
 */
/*
    Called when user clicks on a "like" button
    Updates local storage and calls appropriate function to add or remove like
 */
function onLikeClick()
{
    const postId = this.id.split("-")[1]; // Get current post id

    let likedPosts = getStorageLikes();

    // If post is already liked, unlike it
    if (isPostLiked(postId))
    {
        // Remove post id from storage
        removeStorageLike(postId);
        // Send request to API to unlike post
        api.removeLike(postId, ()=>{onLikeSuccess(postId)}, onLikeAddError);
    }
    // Otherwise, like it
    else
    {
        // Add post id to storage
        addStorageLike(postId);
        // Send request to API to like post
        api.sendLike(postId, ()=>{onLikeSuccess(postId)}, onLikeRemoveError);
    }
}

/*
    Called when a like/unlike request has succeeded
    Refreshes the liked post
    id : id of post to refresh
 */
function onLikeSuccess(id)
{
    // console.log("Server received like request ! Calling refreshPost()...");
    refreshPost(id);
}

/*
    Called when liking a post has failed
 */
function onLikeAddError()
{
    console.warn(this.responseText);
}

/*
    Called when unliking a post has failed
 */
function onLikeRemoveError()
{
    console.warn(this.responseText);
}

// LOCALSTORAGE Manipulation : Locally storing the list of liked posts

/*
    Returns an array composed liked posts ids from localstorage
 */
function getStorageLikes()
{
    let likedPosts = localStorage.getItem("liked-posts"); // Get liked posts from local storage

    // Make likedPosts into an array
    if (!likedPosts) // If localstorage didn't return anything
    {
        likedPosts = [];
    }
    else // If localstorage returned a string, make it into an array
    {
        likedPosts = likedPosts.split(",");
    }

    return likedPosts;
}

/*
    Add post id to localstorage / list of liked posts
 */
function addStorageLike(id)
{
    let storageLikes = getStorageLikes();

    // Only add post to liked list if it's not already there
    if(!isPostLiked(id))
    {
        storageLikes.push(id);
        localStorage.setItem("liked-posts", storageLikes);
    }
}

/*
    Remove post id from localstorage / list of liked posts
*/
function removeStorageLike(id)
{
    let storageLikes = getStorageLikes();

    // Only attempt to remove a like if it's not already there
    if(isPostLiked(id))
    {
        storageLikes.splice(storageLikes.indexOf(id), 1); // Note : splice() returns the deleted element, not the new array
        localStorage.setItem("liked-posts", storageLikes);
    }
}

/*
    Returns :
    - TRUE if post id is present in localstorage / list of liked posts
    - FALSE otherwise
*/
function isPostLiked(id)
{
    const likedPosts = getStorageLikes();
    return getStorageLikes().includes(id);
}

/*
    ------------------------------ TRENDS ------------------------------------------------------------------------------
 */
/*
    Retrieve most used words
 */
function loadTrends()
{
    console.log("Retrieving trends...")
    api.getTrending(onTrendsRetrieved, onTrendsRetrieveError)
}

/*
    Add a trend to the DOM
 */
function addTrend(trend)
{
    const newTrend = trendTemplate.cloneNode(true);

    const newTrendP = newTrend.querySelector("p");
    newTrendP.textContent = trend[0];
    newTrendP.setAttribute("title", trend[1] + " apparitions");

    trendsContainer.appendChild(newTrend);
}

/*
    Called when trends have been retrieved
    Adds the 25 top trends to the DOM
    Removes "loading trends..." text
 */
function onTrendsRetrieved()
{
    console.log("Retrieved trends.");
    loadingTextTrends.remove();

    const responseArray = Object.entries(JSON.parse(this.responseText));
    responseArray.sort((a, b) => {return b[1] - a[1];})
    responseArray.length = 25;

    responseArray.forEach(element => {
        addTrend(element);
    });
}

/*
    Called when retrieval of trends has failed
    Updates "loading trends" text and produces a console warning
 */
function onTrendsRetrieveError()
{
    loadingTextTrends.textContent = "Erreur lors de la récupération des tendances. Détails dans la console.";
    console.warn("Could not retrieve trends. " + this.responseText);
}