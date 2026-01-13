crawl create/update objects for each db xstore darwin enter
test updated/created
if updated
    merge into stage db
if created
    category update
    translate 
    generate embeddings 
    merge into stage db 
generate canonical id
merge into prod db





