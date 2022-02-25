// API Requests


import {APIurl} from "./API_URL.js"; // API_URL.js needs to export an APIurl const containing the base URL of the API

export {
    apiList as getPosts,
    apiGet as getPost,
    apiSend as sendPost,
    apiTrending as getTrending,
    apiLikesSend as sendLike,
    apiLikesRemove as removeLike,
    getApiUrl as url
}

// const APIurl = "";

/*
    Retrieves posts from timestamp
    timestamp : From when should posts be retrieved. Default = 0 / All posts
    onSuccess : Function to call on request success
    onError : Function to call on request error
    onEnd : Function to call when request has completed, regardless of status
    onProgress : Function called when progress event received
 */
function apiList(timestamp, onSuccess, onError, onEnd, onProgress)
{
    let requestTs;
    if(!timestamp)
    {
        requestTs = 0;
    }
    else
    {
        requestTs = timestamp;
    }

    const request = new XMLHttpRequest();
    request.addEventListener("load", onSuccess);
    request.addEventListener("error", onError);
    request.addEventListener("loadend", onEnd);
    request.addEventListener("progress", onProgress)
    request.open("GET", APIurl + "/list?ts=" + requestTs, true);
    request.send();
}

/*
    Retrieves a single post
    id : The id of a post to retrieve
    onSuccess : Function to call on request success
    onError : Function to call on request error
 */
function apiGet(postId, onSuccess, onError)
{
    const request = new XMLHttpRequest();
    request.addEventListener("load", onSuccess);
    request.addEventListener("error", onError);
    request.open("GET", APIurl + "/get?id=" + postId, true);
    request.send();
}

/*
    Sends a post
    userName : Post author
    userMessage : Post message
    onSuccess : Function to call on request success
    onError : Function to call on request error
 */
function apiSend(userName, userMessage, onSuccess, onError)
{
    const params = "name=" + encodeURIComponent(userName) + "&message=" + encodeURIComponent(userMessage);

    const request = new XMLHttpRequest();
    request.addEventListener("load", onSuccess);
    request.addEventListener("error", onError);
    request.open("POST", APIurl + "/send", true);
    request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    request.send(params);
}


/*
    Retrieves trends / most used words
    onSuccess : Function to call on request success
    onError : Function to call on request error
 */
function apiTrending(onSuccess, onError)
{
    const request = new XMLHttpRequest();
    request.addEventListener("load", onSuccess);
    request.addEventListener("error", onError);
    request.open("GET", APIurl + "/trending", true);
    request.send();
}

/*
    Sends a request to like a post
    id : The id of the post to like
    onSuccess : Function to call on request success
    onError : Function to call on request error
 */
function apiLikesSend(postId, onSuccess, onError)
{
    const request = new XMLHttpRequest();
    const params = "message_id=" + encodeURIComponent(postId);
    request.addEventListener("load", onSuccess);
    request.addEventListener("error", onError);
    request.open("PUT", APIurl + "/likes/send", true)
    request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    request.send(params);
}

/*
    Sends a request to unlike a post
    id : The id of the post to unlike
    onSuccess : Function to call on request success
    onError : Function to call on request error
 */
function apiLikesRemove(postId, onSuccess, onError)
{
    const request = new XMLHttpRequest();
    const params = "message_id=" + encodeURIComponent(postId);
    request.addEventListener("load", onSuccess);
    request.addEventListener("error", onError);
    request.open("DELETE", APIurl + "/likes/remove", true)
    request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    request.send(params);
}

/*
    Return the base API url, or an empry string
 */
function getApiUrl()
{
    if (APIurl)
    {
        return APIurl;
    }
    else
    {
        console.error("API URL NOT FOUND\nSpecify an exported const containing the API's url in js/API_URL.js");
        return "";
    }
}