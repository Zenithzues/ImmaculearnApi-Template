
# API ENDPOINTS OVERVIEW STILL CLEANING

## GET /v1
  Verify if the application is running.
 
### Example Response
```sh
        {
'message': 'V1 API App is Running',
'controller': this.__controllerName,
        }
```

-----------------------------------------------------------------------
## POST v1/account
Register a new user.

### URL Path
- /v1/account

### Request Header
- apikey={API_KEY}
- content-type: application/json

### Request Body
```sh
{
  "email": "example@email.com", //ensure that you have valid email or else it will invalid
}
```

### Example Response
```sh
{
  "success": true,
  "message": "User registered successfully.",
  "data": {
    "record_index": 1
  }
}
```
------------------------------------------------------------------------
## GET v1/account
Verify JWT token and fetch user information
  
### URL Path
- /v1/account/

### Request Header
- apikey={API_KEY}
- token={jwt_token}
- content-type: application/json

### Example Response
```sh
{
  "success": true,
  "data": {
    "user_id": 1,
    "username": "johnd",
    "email": "johnd@example.com",
    "created_at": "2024-10-11T12:00:00Z"
  }
}
```
-----------------------------------------------------------------------------------------------------


## PATCH v1/account
update user account

### Query Parameters
- /v1/account?

### Request Header
- apikey={API_KEY}
- token={jwt_token}
- content-type: application/json

### Request Body
```sh
{"password": "pass_123"}
```
OR
```sh
{"username": "RAECELL"}
```
OR
```sh
{"bio": "i'm strong"}
```
OR
```sh
{"password": "pass_123}
```
### Example Response
IF USERNAME
```sh
{
  "success": true,
  "data": {
      "user_id": 1,
      "token": "{new jwt_token}"
}
```
IF not
```sh
{
    "success": true,
    "message": "Profile Updated!",
    "data": {
        "user_id": 1,
        "data": {
            "token": null
        }
    }
}
```
------------------------------------------------------------------------------------------------
## POST v1/account/login
Authenticate and sign a JWT for the user's session.

### Path URL
- v1/account/login
  
### Request Header
- apikey={API_KEY}
- token={jwt_token}
- content-type: application/json

### Request Body
```sh
{
  "user_name": "WILSON",
  "password": "password123"
}
```

### Example Response
```sh
{
  "success": true,
   "data": {
        "token": ""
    }
}
```
-------------------------------------------------------------------------------------------
## POST v1/account/logout
Log out the user.

### Path URL
- /v1/account/logout
  
### Request Header
- token={jwt_token}
- content-type: application/json
 
### Request Body
- it can be pass through the header
  
### Example Response
```sh
{
  "success": true,
  "message": "User logged out successfully."
}
```
-----------------------------------------------------------------------
## GET v1/search
search other user IN CHATLIST

### Query Parameters
-  v1/search?q=keyword&limit=10
  
### Request Header
- apikey={API_KEY}
- token={jwt_token}
- content-type: application/json

### Example Response
```sh
{
  "success": true,
  "data": {
    "users": [
      {
        "user_id": 123,
        "username": "",
        "full_name": "",
        "profile_image": "https://example.com/images/user2.jpg"
      }
    ]
  }
}

```
---------------------------------------------------------------------------------------------------------------------
## POST v1/account/forgot
make a request to change password, send otp tru email.

### Path URL
- /v1/account/forgot
  
### Request Header
- apikey={API_KEY}
- token={jwt_token}
- content-type: application/json

### Request Body
```sh
{
  "email": "GALVEZ1233@gmail.com"
}
```
### Example Response
```sh
{
 "message": "otp has sent to your email."
  }
```
---------------------------------------------------------------------------------------------------------------------
## POST v1/account/reset
reset or change password of the user.

### Path URL
- /v1/account/reset
  
### Request Header
- apikey={API_KEY}
- token={jwt_token}
- content-type: application/json

### Request Body
```sh
{
  "otp": "1233",
  "newPasword": "mynewlife"
}
```
### Example Response
```sh
{
 "message": "password successfully reset."
  }
```
