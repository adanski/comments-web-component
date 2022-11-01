# <ax-comments> element
ax-comments is a standalone web component with minimal set of dependencies (no jQuery!) for implementing an out-of-the-box commenting solution to any web application with an existing backend. It provides all the UI functionalities and ties them to callbacks that let you easily define what you want to do with the data. The library is highly customizable and very easy to integrate thanks to a wide variety of settings.

![Screenshot of jquery-comments](screenshot.png?raw=true "Screenshot of jquery-comments")

## Features

- Commenting
- Replying (nested comments)
- Editing comments
- Deleting comments
- Upvoting comments
- Uploading attachments
- Hashtags
- Pinging users
- Enabling/disabling functionalities
- Localization
- Time formatting
- Field mappings
- Callbacks
- Fully responsive and mobile compatible
- Miscellaneous settings

## Demo
http://adanski.github.io/ax-comments/demo/

## Quick start
**1) Add the following to your HTML file**

```html
<link rel="stylesheet" type="text/css" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css">

<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/jquery/1.9.0/jquery.min.js"></script>
<script type="text/javascript" src="js/jquery-comments.js"></script>
```

**2) Initialize the library**
```javascript
import 'ax-comments/comments-element';

...

const commentsElement = document.createElement('ax-comments');
commentsElement.options = {
    getComments: (onSuccess, onError) => {
        const commentsArray = [{
            id: 1,
            created: '2015-10-01',
            content: 'Lorem ipsum dolort sit amet',
            fullname: 'Simon Powell',
            upvote_count: 2,
            user_has_upvoted: false
        }];
        onSuccess(commentsArray);
    }
};

document.body.append(commentsElement);
```
If you are not using Font Awesome for icons, you should replace the icons with custom images by overriding following options when initializing the library:
```javascript
spinnerIconURL: '',
noCommentsIconURL: '',
closeIconURL: '',
upvoteIconURL: '',      // Only if upvoting is enabled
replyIconURL: '',       // Only if replying is enabled
uploadIconURL: '',      // Only if attachments are enabled
attachmentIconURL: '',  // Only if attachments are enabled
```

## Dependencies
- textcomplete
- sanitize-html
- Font Awesome (optional)

## Documentation
http://adanski.github.io/ax-comments

## Maintainers
- [adanski](https://github.com/adanski)
- [Joona Tykkyläinen](https://www.linkedin.com/in/joonatykkylainen)

## Browser support
Chrome, Firefox, Edge, Safari

## Copyright and license
Code and documentation copyright 2017-2021 [Viima Solutions Oy](https://www.viima.com/), 2022 [adanski](https://github.com/adanski).
Code released under [the MIT license](https://github.com/Viima/jquery-comments/blob/master/LICENSE).
