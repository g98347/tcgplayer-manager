# CSV Import Format Guide

Since you don't have a TCGPlayer API key, you can use CSV import to get your data into the system. Export your data from TCGPlayer and import it using the "Import CSV" buttons.

## Inventory CSV Format

Your CSV file should have the following columns (headers can be in any case):

| Column | Description | Required |
|--------|-------------|----------|
| name / Name / Product | Card name | Yes |
| set_name / Set / set | Set name | No |
| condition / Condition | Card condition (e.g., "Near Mint", "Lightly Played") | No |
| quantity / Quantity / qty | Number of cards | No (defaults to 0) |
| purchase_price / Purchase_Price / cost | What you paid for the card | No (defaults to 0) |
| list_price / List_Price / price | List price on TCGPlayer | No (defaults to 0) |
| tcgplayer_id / sku_id / skuId / sku | TCGPlayer SKU ID | No |

### Example Inventory CSV

```csv
name,set_name,condition,quantity,purchase_price,list_price,tcgplayer_id
Charizard Base Set,Base Set,Near Mint,5,150.00,250.00,12345
Pikachu Jungle,Jungle,Lightly Played,10,5.00,15.00,67890
Blastoise Fossil,Fossil,Near Mint,3,80.00,120.00,11111
```

## Orders CSV Format

Your CSV file should have the following columns (headers can be in any case):

| Column | Description | Required |
|--------|-------------|----------|
| order_number / Order_Number / orderId | TCGPlayer order number | No |
| order_date / Order_Date / date | Order date (YYYY-MM-DD) | No |
| buyer_name / Buyer_Name / buyer | Buyer's name | No |
| total_amount / Total_Amount / total | Total order amount | No (defaults to 0) |
| shipping_cost / Shipping_Cost / shipping | Shipping cost | No (defaults to 0) |
| tcgplayer_fee / TCGPlayer_Fee / fee | TCGPlayer fee | No (defaults to 0) |
| status / Status | Order status (e.g., "shipped", "pending") | No (defaults to "pending") |
| items | JSON array of items in the order | No |

### Example Orders CSV

```csv
order_number,order_date,buyer_name,total_amount,shipping_cost,tcgplayer_fee,status
TCG-12345,2024-01-15,John Doe,45.00,3.50,4.50,shipped
TCG-12346,2024-01-16,Jane Smith,25.00,2.50,2.50,pending
TCG-12347,2024-01-17,Bob Johnson,100.00,5.00,10.00,shipped
```

## How to Export from TCGPlayer

1. Log in to your TCGPlayer seller account
2. Go to your Inventory or Orders section
3. Look for an "Export" or "Download CSV" option
4. Export the data as a CSV file
5. Import the CSV file using the "Import CSV" button in this app

## Notes

- The importer will try to match existing items by `tcgplayer_id` (for inventory) or `order_number` (for orders)
- If a match is found, the existing record will be updated
- If no match is found, a new record will be created
- Column headers are case-insensitive (e.g., "Name" and "name" both work)
- Missing columns will use default values
