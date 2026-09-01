nohup npm run start -- -p 3000 > blog.log 2>&1 &
echo $! > blog-3000.pid
